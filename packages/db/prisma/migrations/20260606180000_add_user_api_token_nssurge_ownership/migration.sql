-- Add a per-user API token used by NSSurge collector requests.
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "apiToken" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_user" (
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "apiToken",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  CASE
    WHEN "id" = 'nssurge-dev-user' THEN 'nss_dev_local'
    ELSE 'nss_' || lower(hex(randomblob(32)))
  END,
  "createdAt",
  "updatedAt"
FROM "user";

INSERT OR IGNORE INTO "new_user" (
  "id",
  "name",
  "email",
  "emailVerified",
  "image",
  "apiToken",
  "createdAt",
  "updatedAt"
)
VALUES (
  'nssurge-dev-user',
  'NSSurge Dev',
  'nssurge-dev@example.local',
  true,
  NULL,
  'nss_dev_local',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "user_apiToken_key" ON "user"("apiToken");

-- Rebuild the event table so every event belongs to a user.
CREATE TABLE "new_nssurge_http_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" TEXT NOT NULL,
  "surgeRequestId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "capturedAtMs" BIGINT NOT NULL,
  "receivedAtMs" BIGINT NOT NULL,
  "scriptName" TEXT,
  "method" TEXT,
  "url" TEXT NOT NULL,
  "host" TEXT,
  "requestHeadersJson" TEXT,
  "responseStatus" INTEGER,
  "responseHeadersJson" TEXT,
  "contentType" TEXT,
  "bodyKind" TEXT NOT NULL DEFAULT 'none',
  "bodyText" TEXT,
  "bodyByteLength" BIGINT,
  "bodySkippedReason" TEXT,
  "rawJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "nssurge_http_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_nssurge_http_events" (
  "id",
  "userId",
  "surgeRequestId",
  "eventType",
  "capturedAtMs",
  "receivedAtMs",
  "scriptName",
  "method",
  "url",
  "host",
  "requestHeadersJson",
  "responseStatus",
  "responseHeadersJson",
  "contentType",
  "bodyKind",
  "bodyText",
  "bodyByteLength",
  "bodySkippedReason",
  "rawJson",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'nssurge-dev-user',
  "surgeRequestId",
  "eventType",
  "capturedAtMs",
  "receivedAtMs",
  "scriptName",
  "method",
  "url",
  "host",
  "requestHeadersJson",
  "responseStatus",
  "responseHeadersJson",
  "contentType",
  "bodyKind",
  "bodyText",
  "bodyByteLength",
  "bodySkippedReason",
  "rawJson",
  "createdAt",
  "updatedAt"
FROM "nssurge_http_events";

DROP TABLE "nssurge_http_events";
ALTER TABLE "new_nssurge_http_events" RENAME TO "nssurge_http_events";

CREATE INDEX "nssurge_http_events_userId_idx" ON "nssurge_http_events"("userId");
CREATE INDEX "nssurge_http_events_capturedAtMs_idx" ON "nssurge_http_events"("capturedAtMs");
CREATE INDEX "nssurge_http_events_host_idx" ON "nssurge_http_events"("host");
CREATE INDEX "nssurge_http_events_url_idx" ON "nssurge_http_events"("url");
CREATE INDEX "nssurge_http_events_eventType_idx" ON "nssurge_http_events"("eventType");
CREATE INDEX "nssurge_http_events_responseStatus_idx" ON "nssurge_http_events"("responseStatus");
CREATE UNIQUE INDEX "nssurge_http_events_userId_surgeRequestId_eventType_key" ON "nssurge_http_events"("userId", "surgeRequestId", "eventType");

PRAGMA foreign_key_check;
PRAGMA foreign_keys = ON;
