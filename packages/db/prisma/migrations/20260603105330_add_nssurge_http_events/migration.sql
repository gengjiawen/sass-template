-- CreateTable
CREATE TABLE "nssurge_http_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "nssurge_http_events_capturedAtMs_idx" ON "nssurge_http_events"("capturedAtMs");

-- CreateIndex
CREATE INDEX "nssurge_http_events_host_idx" ON "nssurge_http_events"("host");

-- CreateIndex
CREATE INDEX "nssurge_http_events_url_idx" ON "nssurge_http_events"("url");

-- CreateIndex
CREATE INDEX "nssurge_http_events_eventType_idx" ON "nssurge_http_events"("eventType");

-- CreateIndex
CREATE INDEX "nssurge_http_events_responseStatus_idx" ON "nssurge_http_events"("responseStatus");

-- CreateIndex
CREATE UNIQUE INDEX "nssurge_http_events_surgeRequestId_eventType_key" ON "nssurge_http_events"("surgeRequestId", "eventType");
