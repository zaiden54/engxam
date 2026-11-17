import selfsigned from "selfsigned";
import { mkdir, writeFile } from "node:fs/promises";
const cert = await selfsigned.generate([{ name: "commonName", value: "localhost" }], { keySize: 2048, extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }] }] });
await mkdir("certificates", { recursive: true });
await writeFile("certificates/localhost.pem", cert.cert);
await writeFile("certificates/localhost-key.pem", cert.private);
console.log("Local-only test certificate generated; system trust store unchanged");
