import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorage, storageBucket } from "../src/lib/storage/client";
nextEnv.loadEnvConfig(process.cwd());
async function main() {
  const storage = getStorage(); const Key = `_engxam_probe/${randomUUID()}.txt`; const Bucket = storageBucket;
  try {
    const put = await getSignedUrl(storage, new PutObjectCommand({ Bucket, Key, ContentType: "text/plain", IfNoneMatch: "*" }), { expiresIn: 60 });
    const uploaded = await fetch(put, { method: "PUT", headers: { "content-type": "text/plain", "if-none-match": "*" }, body: "engxam-probe" });
    assert.ok(uploaded.ok, `upload ${uploaded.status}`);
    const head = await storage.send(new HeadObjectCommand({ Bucket, Key })); assert.equal(head.ContentLength, 12);
    const url = await getSignedUrl(storage, new GetObjectCommand({ Bucket, Key }), { expiresIn: 60 });
    assert.equal(await (await fetch(url)).text(), "engxam-probe");
    const range = await fetch(url, { headers: { Range: "bytes=0-5" } }); assert.equal(range.status, 206); assert.equal(await range.text(), "engxam");
    const anonymous = new URL(url); anonymous.search = ""; assert.ok([401,403].includes((await fetch(anonymous)).status));
    const overwrite = await fetch(put, { method: "PUT", headers: { "content-type": "text/plain", "if-none-match": "*" }, body: "modified" }); assert.equal(overwrite.status, 412);
    const cors = await fetch(url, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "GET" } });
    assert.ok(cors.ok); assert.ok(cors.headers.get("access-control-allow-origin"));
    console.log("PASS Object Storage: signed PUT/GET, metadata, Range 206, anonymous denied, overwrite denied 412, CORS");
  } finally { await storage.send(new DeleteObjectCommand({ Bucket, Key })); storage.destroy(); console.log("Probe object removed"); }
}
main().catch(error => { console.error("FAIL storage probe:", error instanceof assert.AssertionError ? error.message : "service error (details redacted)"); process.exitCode = 1; });
