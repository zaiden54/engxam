import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
let storage: S3Client | undefined;
export const storageBucket = "assets";
export function getStorage() {
  const result = z.object({ AWS_ENDPOINT_URL_S3: z.url(), AWS_REGION: z.string().min(1), AWS_ACCESS_KEY_ID: z.string().min(1), AWS_SECRET_ACCESS_KEY: z.string().min(1) }).safeParse(process.env);
  if (!result.success) throw new Error("Object Storage environment is missing or invalid");
  if (!storage) storage = new S3Client({ forcePathStyle: true, endpoint: result.data.AWS_ENDPOINT_URL_S3, region: result.data.AWS_REGION, credentials: { accessKeyId: result.data.AWS_ACCESS_KEY_ID, secretAccessKey: result.data.AWS_SECRET_ACCESS_KEY } });
  return storage;
}
