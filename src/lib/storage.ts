// src/lib/storage.ts — Cloudflare R2 wrapper
// يُعيد signed URLs للرفع/التحميل من R2. لو لم تُعَدّ بيئة R2، يعمل في وضع stub.
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKey = process.env.R2_ACCESS_KEY_ID;
const secretKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET ?? "warraq";

export const isStorageConfigured = Boolean(
  accountId && accessKey && secretKey && accountId !== "stub",
);

// Vercel Blob — تخزين بديل سهل (المتصفّح يرفع مباشرةً، يتجاوز حدّ جسم الطلب 4.5م)
export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const s3 = isStorageConfigured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKey!,
        secretAccessKey: secretKey!,
      },
    })
  : null;

export async function getUploadUrl(
  storageKey: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  if (!s3) throw new Error("R2_NOT_CONFIGURED");
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function getDownloadUrl(
  storageKey: string,
  expiresIn = 600,
): Promise<string> {
  // مفاتيح Vercel Blob (وأي تخزين عامّ) هي روابط كاملة — تُستعمل كما هي
  if (/^https?:\/\//.test(storageKey)) return storageKey;
  if (!s3) throw new Error("R2_NOT_CONFIGURED");
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}
