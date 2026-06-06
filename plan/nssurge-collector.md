# NSSurge Traffic Collector — 实现规格

> 状态：已实现（本文档为规格 + 实现约定）

## 背景

仓库：`gengjiawen/sass-template`（monorepo）

- Web app：`apps/web`
- 数据库包：`packages/db`
- 已内置 Prisma、SQLite/Turso、`@my-better-t-app/db`
- DB 部分必须使用模板已有 Prisma 体系

## 目标

Surge 的 `http-request` 和 `http-response` script 把捕获到的请求/响应事件 POST 到本地 Next.js server。Next.js server 用 Prisma 写入现有数据库。前端页面可以展示请求，并且页面上有一个按钮/表单，可以输入域名并生成可复制、可下载的 Surge `.sgmodule`。

## 重要约束

1. 使用 Node.js / Next.js / TypeScript
2. 使用 Next.js App Router
3. API 入口：`apps/web/src/app/api/nssurge/route.ts` → URL：`/api/nssurge`
4. 页面入口：`apps/web/src/app/nssurge/page.tsx` → URL：`/nssurge`
5. DB 部分必须使用 `packages/db` 里的 Prisma
6. 使用现有 `DATABASE_URL`
7. 使用 `import prisma from "@my-better-t-app/db"`
8. 只保存文本 body
9. binary body 不保存
10. 如果 body 是二进制，只记录 `bodyKind = "binary_skipped"`、`bodyByteLength` 和 `bodySkippedReason`
11. 不要因为 body 是二进制就丢掉整条 request/response event；事件本身仍然要保存，只是 `bodyText` 为 `null`
12. 不要接入 tRPC；collector API 用普通 Route Handler 即可
13. 不要创建 SQL view；exchanges 聚合在应用层用 Prisma 查询后组装

---

## 项目结构要求

新增或修改这些文件：

| 路径                                              | 说明                                  |
| ------------------------------------------------- | ------------------------------------- |
| `packages/db/prisma/schema/nssurge.prisma`        | Prisma 模型与 enum                    |
| `apps/web/src/app/api/nssurge/route.ts`           | API Route Handler                     |
| `apps/web/src/app/nssurge/page.tsx`               | 页面入口                              |
| `apps/web/src/app/nssurge/nssurge-dashboard.tsx`  | 仪表盘 UI                             |
| `apps/web/src/lib/nssurge/schema.ts`              | Zod schema、normalize                 |
| `apps/web/src/lib/nssurge/repository.ts`          | Prisma 读写                           |
| `apps/web/src/lib/nssurge/module.ts`              | Surge `.sgmodule` 生成                |
| `apps/web/src/lib/nssurge/curl.ts`                | exchange → cURL 命令生成              |
| `apps/web/src/locales/en-US.json`                 | 页面 i18n（与 `zh-CN.json` 同步 key） |
| `apps/web/public/nssurge/log-request.js`          | Surge request script                  |
| `apps/web/public/nssurge/log-response.js`         | Surge response script                 |
| `apps/web/.env.example` 或仓库已有 `.env.example` | 环境变量示例                          |
| `README.md`                                       | 追加 NSSurge collector 使用说明       |

---

## Prisma Schema

文件：`packages/db/prisma/schema/nssurge.prisma`

注意：

1. 本 repo 的 Prisma schema 使用 **schema folder**，不要把所有内容塞进原来的 `schema.prisma`
2. `generator` 和 `datasource` 已在 `packages/db/prisma/schema/schema.prisma` 中，**不要重复声明**
3. 新增 `nssurge.prisma`，只放 model 和 enum
4. 修改 schema 后需要运行 Prisma generate / migrate
5. 使用 `BigInt` 存 epoch milliseconds（当前毫秒时间戳超过 Prisma `Int` 范围）
6. `headers` 和 `rawJson` 用 `String` 保存 JSON 字符串，不使用 `Json` 字段（SQLite/Turso 兼容）

### 新增内容

```prisma
enum NssurgeEventType {
  request
  response
}

enum NssurgeBodyKind {
  none
  text
  binary_skipped
  too_large_skipped
  decode_failed_skipped
}

model NssurgeHttpEvent {
  id                  Int               @id @default(autoincrement())
  surgeRequestId      String
  eventType           NssurgeEventType
  capturedAtMs        BigInt
  receivedAtMs        BigInt
  scriptName          String?
  method              String?
  url                 String
  host                String?
  requestHeadersJson  String?
  responseStatus      Int?
  responseHeadersJson String?
  contentType         String?
  bodyKind            NssurgeBodyKind   @default(none)
  bodyText            String?
  bodyByteLength      BigInt?
  bodySkippedReason   String?
  rawJson             String
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@unique([surgeRequestId, eventType])
  @@index([capturedAtMs])
  @@index([host])
  @@index([url])
  @@index([eventType])
  @@index([responseStatus])
  @@map("nssurge_http_events")
}
```

### 迁移命令

结合根目录 `package.json` 脚本（已确认存在）：

```bash
pnpm db:generate
pnpm db:migrate
```

如需命名 migration：

```bash
pnpm --filter @my-better-t-app/db db:migrate -- --name add_nssurge_collector
```

其他 db 相关脚本（`packages/db/package.json`）：

- `db:generate` → `prisma generate`
- `db:migrate` → `prisma migrate dev`
- `db:migrate:deploy` → `prisma migrate deploy`
- `db:studio` → `prisma studio`

---

## API 设计

文件：`apps/web/src/app/api/nssurge/route.ts`

```ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
```

### POST `/api/nssurge`

用途：接收 Surge script 上报的 request/response event，并用 Prisma upsert 到 `NssurgeHttpEvent`。

#### 鉴权

1. 支持 `Authorization: Bearer <user-api-token>`
2. token 来自注册用户的 `User.apiToken`，不是全局 env
3. production 的 POST 必须校验用户 API token，并写入该用户名下
4. development 没有 token 时允许写入内部 `nssurge-dev-user`
5. GET/DELETE 在 production 支持登录 session 或用户 API token，并且只操作当前用户数据
6. 不要泄露内部 stack trace

#### 请求体处理

1. **不要**直接 `await request.json()`
2. 先 `await request.text()`
3. 检查 event JSON payload 大小
4. 默认最大 4MB
5. 上限使用代码常量，不从 env 覆盖
6. 超过限制返回 `413`
7. `JSON.parse` 后用 zod 校验
8. 如果 payload 里出现 `body.base64`、`body.sha256` 等非法 body 编码字段，要忽略并且不要写进 `rawJson`
9. `rawJson` 保存 normalized/sanitized JSON，不保存原始未过滤 payload
10. 成功返回 `204`
11. 失败返回 JSON error，但不要泄露内部 stack trace

#### 事件 JSON 格式

```json
{
  "source": "nssurge",
  "version": 1,
  "eventType": "request",
  "surgeRequestId": "abc",
  "capturedAt": 1710000000000,
  "scriptName": "nssurge-log-request",
  "url": "https://api.example.com/v1/foo",
  "method": "POST",
  "host": "api.example.com",
  "requestHeaders": {},
  "responseStatus": null,
  "responseHeaders": null,
  "body": {
    "kind": "text",
    "text": "{\"hello\":\"world\"}",
    "byteLength": 17,
    "skippedReason": null
  },
  "metadata": {
    "contentType": "application/json",
    "environment": {},
    "network": {}
  }
}
```

`body.kind` 只允许：

- `none`
- `text`
- `binary_skipped`
- `too_large_skipped`
- `decode_failed_skipped`

**严禁（作为 `body.kind` 等）：**

- `base64`
- `sha256`

#### Prisma 写入逻辑

1. `apps/web/src/lib/nssurge/repository.ts` 里 `import prisma from "@my-better-t-app/db"`
2. 提供函数：
   - `insertNssurgeEvent(event)`
   - `listNssurgeEvents(params)`
   - `listNssurgeExchanges(params)`
   - `clearNssurgeEvents(params)`
3. `insertNssurgeEvent` 使用 `prisma.nssurgeHttpEvent.upsert`
4. upsert 的 unique key 是 `surgeRequestId` + `eventType`
5. 同一个 `surgeRequestId` + `eventType` 重复上报时更新旧行，不插入重复行
6. BigInt 字段写入时用 `BigInt(value)`
7. API 返回 JSON 前，所有 BigInt 都要转换成 number 或 string（epoch ms 可转 number）
8. headers 保存为 `JSON.stringify` 后的字符串
9. `requestHeadersJson` / `responseHeadersJson` 必须完整保留原 header 值
10. `rawJson` 必须是 normalize 后的 JSON，并过滤非法 body 编码字段

#### `listNssurgeExchanges(params)`

1. **不使用** SQL view
2. 用 Prisma 查询 request events 和 response events，然后在 TypeScript 里按 `surgeRequestId` 聚合
3. 默认以 response `capturedAtMs` desc 或 request `capturedAtMs` desc 排序
4. 返回结构：

```ts
{
  surgeRequestId,
  requestCapturedAtMs,
  responseCapturedAtMs,
  method,
  url,
  host,
  responseStatus,
  requestContentType,
  responseContentType,
  requestHeadersJson,
  responseHeadersJson,
  requestBodyKind,
  responseBodyKind,
  requestBodyByteLength,
  responseBodyByteLength,
  requestBodySkippedReason,
  responseBodySkippedReason,
  requestBodyText,   // 仅 withBody=true
  responseBodyText,  // 仅 withBody=true
}
```

5. `withBody=false` 时不要返回 `requestBodyText` / `responseBodyText`
6. `withBody=true` 时才返回 bodyText
7. 支持 `limit`、`host`、`status`、`since`、`q`
8. `q` 对 url 做 contains 搜索
9. `status` 只作用于 response event
10. `host` 作用于 request/response 任一侧，但最终 exchange 要能显示完整信息

### GET `/api/nssurge`

用途：给前端页面查询数据。

Query 参数：

| 参数        | 说明                                             |
| ----------- | ------------------------------------------------ |
| `view`      | `"exchanges"` \| `"events"`，默认 `"exchanges"`  |
| `limit`     | 默认 100，最大 1000                              |
| `host`      | 可选                                             |
| `eventType` | `request` \| `response`，仅 `view=events` 时有效 |
| `status`    | 可选                                             |
| `since`     | 可选，毫秒时间戳                                 |
| `q`         | 可选，模糊搜索 URL                               |
| `withBody`  | `"true"` \| `"false"`，默认 false                |

返回：JSON；`withBody=false` 时不返回 `bodyText`；BigInt 需先转换再 `JSON.stringify`。

### DELETE `/api/nssurge`

用途：清空或按时间删除数据。

Query 参数：

- `olderThanDays`，可选
- `all=true`，可选

要求：

1. 删除接口**必须**校验登录 session 或用户 API token
2. `all=true` 时清空当前用户的 `NssurgeHttpEvent`
3. `olderThanDays=7` 时删除 7 天以前的数据
4. 删除后返回 JSON：`{ ok: true, deletedCount }`

---

## schema.ts

文件：`apps/web/src/lib/nssurge/schema.ts`

职责：

1. 定义 zod schema
2. 定义 TypeScript 类型
3. 做 normalize
4. headers 规范化为字符串值
5. body schema 过滤
6. content-type 提取
7. host 从 URL 或 payload 提取

### Headers 处理

1. header 名和值原样保存
2. `null` / `undefined` 值转为空字符串
3. 非字符串值用 `String(value)` 转成字符串

### Body 处理

1. text body 原样保存
2. `body.kind` 不允许 base64
3. 脚本误传 base64/sha256 字段时，normalize 后必须删除
4. `rawJson` 必须基于 normalize 后的数据生成

---

## Surge Scripts

路径：

- `apps/web/public/nssurge/log-request.js`
- `apps/web/public/nssurge/log-response.js`

Next.js 启动后可访问：

- `/nssurge/log-request.js`
- `/nssurge/log-response.js`

### 共同要求

1. 不使用 Node.js API
2. 不使用 Buffer
3. 支持 `$argument` 解析：  
   `endpoint=http%3A%2F%2F192.168.1.23%3A3000%2Fapi%2Fnssurge&token=<user-api-token>`
4. 如果没有 endpoint，默认：`http://127.0.0.1:3000/api/nssurge`
5. 如果 request URL 包含 `/api/nssurge`，直接 `$done({})`，避免递归
6. collector POST 失败不能影响原请求/响应
7. 无论成功失败，都必须 `$done({})`
8. `$httpClient.post` timeout 设置为 `0.8` 或 `1` 秒
9. body 只保存文本
10. binary body 不 base64、不 sha256、不落 `bodyText`

### `normalizeBody(body, headers)` 规则

1. `body == null` → `{ kind: "none", text: null, byteLength: 0, skippedReason: null }`
2. `typeof body === "string"`：
   - 若 content-type 为明显二进制（`image/*`、`video/*`、`audio/*`、`font/*`、`application/octet-stream`、`application/pdf`、`application/zip`）→  
     `{ kind: "binary_skipped", text: null, byteLength: approximateUtf8Bytes(body), skippedReason: "binary content-type" }`
   - 否则 → `{ kind: "text", text: body, byteLength: utf8ByteLength(body), skippedReason: null }`
3. `body` 是 `Uint8Array`：
   - 文本类型尝试 `TextDecoder("utf-8", { fatal: false })` 解码  
     文本类型包括：`text/*`、`application/json`、`application/xml`、`application/x-www-form-urlencoded`、`application/graphql`、`application/javascript`、`*/*+json`、`*/*+xml`
   - 解码成功 → `{ kind: "text", text: decodedText, byteLength: body.length, skippedReason: null }`
   - 非文本类型 → `{ kind: "binary_skipped", text: null, byteLength: body.length, skippedReason: "Uint8Array binary body" }`
4. 不要做 base64
5. 不要做 sha256
6. 不要格式化 JSON body，保存原始文本

### log-request.js

读取：`$request.id`、`$request.url`、`$request.method`、`$request.headers`、`$request.body`、`$script.name`、`$environment`、`$network`

发送 `eventType = "request"`，payload 含：`source`、`version`、`eventType`、`surgeRequestId`、`capturedAt`、`scriptName`、`url`、`method`、`host`、`requestHeaders`、`responseStatus: null`、`responseHeaders: null`、`body`、`metadata.contentType`、`metadata.environment`、`metadata.network`

### log-response.js

读取：`$request.id`、`$request.url`、`$request.method`、`$request.headers`、`$response.status`、`$response.headers`、`$response.body`、`$script.name`、`$environment`、`$network`

发送 `eventType = "response"`，payload 含 request/response headers、status、body 等。

---

## Surge Module Generator

文件：`apps/web/src/lib/nssurge/module.ts`

输入：

- `domains: string[]`
- `includeSubdomains: boolean`
- `collectorEndpoint: string`
- `token: string`
- `scriptBaseUrl: string`
- `maxSize: number`
- `timeoutSeconds: number`
- `enableMitm: boolean`
- `protocol: "https" | "http" | "both"`

输出：`.sgmodule` 字符串

### 生成规则

1. domain 输入支持：`api.example.com`、`*.example.com`、完整 URL（如 `https://httpbin.org/`）、逗号或换行分隔多个
2. 生成前用 `parseDomainHost` 去掉 scheme、路径、尾斜杠，只保留 hostname（及非默认端口）；避免 pattern 出现 `https://https://...`
3. 默认 exact host；`includeSubdomains=true` 时 pattern 匹配子域名
4. pattern 必须转义正则特殊字符
5. `script-path`：`${scriptBaseUrl}/log-request.js`、`${scriptBaseUrl}/log-response.js`
6. `argument` 使用 URL query 格式，`endpoint` 和 `token` 必须 `encodeURIComponent`
7. `requires-body=true`、`binary-body-mode=true`
8. `max-size` 默认 `1048576`，`timeout` 默认 `1`
9. `[MITM]` 默认：`hostname = %APPEND% api.example.com`（仅 hostname，不含 `https://`）
10. `includeSubdomains=true` 且 domain 是 `example.com` → `hostname = %APPEND% example.com, *.example.com`
11. 用户输入 `*.example.com` 则 hostname 保留 `*.example.com`
12. 顶部：

```ini
#!name=NSSurge Collector - <domain summary>
#!desc=Capture text request/response bodies to local Next.js + Prisma collector. Binary bodies are skipped.
```

### 示例输出

```ini
#!name=NSSurge Collector - api.example.com
#!desc=Capture text request/response bodies to local Next.js + Prisma collector. Binary bodies are skipped.

[Script]
nssurge-api-example-com-request = type=http-request, pattern=^https:\/\/api\.example\.com\/, requires-body=true, binary-body-mode=true, max-size=1048576, timeout=1, script-path=http://192.168.1.23:3000/nssurge/log-request.js, argument=endpoint=http%3A%2F%2F192.168.1.23%3A3000%2Fapi%2Fnssurge&token=<user-api-token>
nssurge-api-example-com-response = type=http-response, pattern=^https:\/\/api\.example\.com\/, requires-body=true, binary-body-mode=true, max-size=1048576, timeout=1, script-path=http://192.168.1.23:3000/nssurge/log-response.js, argument=endpoint=http%3A%2F%2F192.168.1.23%3A3000%2Fapi%2Fnssurge&token=<user-api-token>

[MITM]
hostname = %APPEND% api.example.com
```

---

## 前端页面

- `apps/web/src/app/nssurge/page.tsx`
- `apps/web/src/app/nssurge/nssurge-dashboard.tsx`

路径：`/nssurge`

### 布局

单页两个 Tab：**Request list** | **Generate Surge module**（无顶部统计卡片）。

UI 文案走 `react-i18next`，key 为英文 UI 字符串，维护 `en-US.json` / `zh-CN.json`。

### Request list

1. 默认每 2 秒 auto refresh，可暂停；支持 URL 搜索、host / status 过滤、limit 100–1000
2. 表头列（固定 grid）：**ID** | **Time** (`hh:mm:ss`) | **URL** | **Status** | **Duration**（response − request，如 `42ms` / `1.2s`）
3. **ID** 即 Surge `$request.id`（`surgeRequestId`）；列表只显示 `-` 后短后缀，悬停 / 详情保留完整值
4. 列表不加载 body；展开时 `withBody=true` 拉详情
5. 详情元信息 2×2 网格：上行请求/响应采集时间，下行 ID（左）与 **Copy as cURL**（右）
6. 详情另含 headers、bodies、body kind、byte length、skipped reason；JSON body 可 Pretty / Raw；`binary_skipped` 不展示 base64

### Copy as cURL

文件：`apps/web/src/lib/nssurge/curl.ts`，函数 `exchangeToCurl(exchange)`。

1. 由 method、URL、请求头、text body 生成 bash curl；`-X`、`-H '…'`、`--data-raw '…'` 各占一行（`-H` 与 header 值不可拆行）
2. 跳过 `host`、`content-length`、HTTP/2 伪头等；binary / 跳过的 body 不含 `--data-raw`
3. 展开详情后点击复制；加载 body 期间按钮禁用

### UI 风格

- 参考 geekdada/yasd 信息密度，**不**接入 Surge HTTP API / `/v1/requests/recent`
- Tailwind / shadcn/ui / lucide-react

### Generate Surge Module 表单（第二个 Tab）

| 字段               | 默认                                           |
| ------------------ | ---------------------------------------------- |
| Domains textarea   | `api.example.com`                              |
| Include subdomains | checkbox                                       |
| Protocol           | https / http / both，默认 https                |
| Collector endpoint | `${location.origin}/api/nssurge`               |
| Script base URL    | `${location.origin}/nssurge`                   |
| Token              | 当前登录用户的专属 API token；本地未登录可为空 |
| Max body size      | 1048576                                        |
| Timeout            | 1                                              |
| Enable MITM        | true，默认勾选                                 |

生成后：显示 `.sgmodule` 文本、Copy、Download（Blob 前端下载）。

**提醒：**

- `localhost` / `127.0.0.1` 时醒目提示：iPhone Surge 需用 Mac 局域网 IP
- HTTPS body 需要 MITM hostname + 信任 CA
- 不要长期全局开启 `requires-body`

---

## 环境变量

- 不新增 NSSurge 专用 env；数据库继续使用 `DATABASE_URL`

---

## README 追加内容

1. 如何安装依赖
2. Prisma client：`pnpm db:generate`
3. Migration：`pnpm db:migrate`
4. 启动 web：`pnpm dev:web` 或 `pnpm --filter web dev`
5. 打开页面：`http://localhost:3000/nssurge`
6. 如何生成 Surge module
7. iPhone Surge → Mac：endpoint 用局域网 IP，不能用 `127.0.0.1`
8. HTTPS body：MITM hostname、CA 安装与信任
9. 为什么 binary body 不保存
10. 为什么不建议全局 `requires-body=true`
11. Prisma Studio：`pnpm db:studio`
12. 清空数据：

```bash
curl -X DELETE "http://localhost:3000/api/nssurge?all=true" \
  -H "Authorization: Bearer <user-api-token>"
```

---

## 测试 / 验证

### Request event curl

```bash
curl -X POST "http://localhost:3000/api/nssurge" \
  -H "Authorization: Bearer <user-api-token>" \
  -H "Content-Type: application/json" \
  --data '{
    "source": "nssurge",
    "version": 1,
    "eventType": "request",
    "surgeRequestId": "demo-1",
    "capturedAt": 1710000000000,
    "scriptName": "demo",
    "url": "https://api.example.com/v1/hello",
    "method": "POST",
    "host": "api.example.com",
    "requestHeaders": {
      "content-type": "application/json",
      "authorization": "Bearer secret"
    },
    "responseStatus": null,
    "responseHeaders": null,
    "body": {
      "kind": "text",
      "text": "{\"hello\":\"world\"}",
      "byteLength": 17,
      "skippedReason": null
    },
    "metadata": {
      "contentType": "application/json",
      "environment": {},
      "network": {}
    }
  }'
```

### Response event curl

```bash
curl -X POST "http://localhost:3000/api/nssurge" \
  -H "Authorization: Bearer <user-api-token>" \
  -H "Content-Type: application/json" \
  --data '{
    "source": "nssurge",
    "version": 1,
    "eventType": "response",
    "surgeRequestId": "demo-1",
    "capturedAt": 1710000000500,
    "scriptName": "demo",
    "url": "https://api.example.com/v1/hello",
    "method": "POST",
    "host": "api.example.com",
    "requestHeaders": {
      "content-type": "application/json"
    },
    "responseStatus": 200,
    "responseHeaders": {
      "content-type": "application/json",
      "set-cookie": "secret"
    },
    "body": {
      "kind": "text",
      "text": "{\"ok\":true}",
      "byteLength": 11,
      "skippedReason": null
    },
    "metadata": {
      "contentType": "application/json",
      "environment": {},
      "network": {}
    }
  }'
```

### 验证点

1. request event 可以插入
2. response event 可以插入
3. 同一 `surgeRequestId` 的 request/response 在 exchanges API 里关联
4. 重复上报不产生重复行
5. text body 保存正确
6. binary body 不保存，只保存 skipped metadata
7. headers 原样保存
8. `rawJson` 为 normalize 后的 JSON，不含非法 body 编码字段
9. 页面列表列为 ID / Time / URL / Status / Duration
10. 页面能展开详情并 Copy as cURL
11. 输入 `https://host/` 生成 module 时 pattern / MITM hostname 正确
12. 页面能生成可复制、可下载的 `.sgmodule`
13. `pnpm db:generate` 通过
14. TypeScript 通过
15. `pnpm build` 尽量通过

---

## 完成后应输出的文档章节（实现后填写）

1. 新增/修改文件列表
2. Prisma schema 变更说明
3. API 说明
4. 页面功能说明
5. Surge module 生成示例
6. 本地启动和验证步骤
7. 已知限制
