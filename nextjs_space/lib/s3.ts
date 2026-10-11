import { createS3Client, getBucketConfig } from './aws-config';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  getPresignedUploadUrlForFile,
  getPresignedDownloadUrl as getR2DownloadUrl,
  buildPublicUrl as buildR2PublicUrl,
  deleteFromR2,
  isR2Key,
} from './r2-storage';

const s3Client = createS3Client();

/**
 * Generate a presigned upload URL.
 *
 * New uploads are routed to Cloudflare R2 under the "gift/" folder (per product
 * requirement that all newly uploaded media — gift catalog assets, profile
 * pictures, social media images/videos, and everything uploaded from the web or
 * mobile app — is stored in R2's gift folder). The returned shape
 * ({ uploadUrl, cloud_storage_path }) is unchanged, so all existing web and
 * mobile upload clients keep working without modification. The presigned PUT is
 * signed with only the host header, so clients may send any Content-Type /
 * Content-Disposition headers.
 *
 * @param folder R2 folder prefix (defaults to "gift/uploads"). Specialized
 *   callers pass an organized subfolder such as "gift/gifts".
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false,
  folder: string = 'gift/uploads'
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  return getPresignedUploadUrlForFile(fileName, contentType, folder);
}

/**
 * Resolve a stored cloud_storage_path to a viewable URL.
 *
 * - Full URLs are returned as-is.
 * - New R2 keys (gift/ or shorts/ prefixes) resolve to the R2 CDN public URL
 *   (public assets) or a temporary presigned R2 GET URL (private assets).
 * - Legacy S3 keys keep resolving exactly as before, so existing files continue
 *   to work.
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
): Promise<string> {
  if (!cloud_storage_path) return '';

  // Already a fully-qualified URL (e.g. previously stored absolute URL).
  if (/^https?:\/\//i.test(cloud_storage_path)) {
    return cloud_storage_path;
  }

  // New uploads live in Cloudflare R2.
  if (isR2Key(cloud_storage_path)) {
    if (isPublic) {
      return buildR2PublicUrl(cloud_storage_path);
    }
    return getR2DownloadUrl(cloud_storage_path);
  }

  // Legacy AWS S3 objects.
  const { bucketName } = getBucketConfig();
  const region = process.env.AWS_REGION || 'us-east-1';

  if (isPublic) {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: 'attachment',
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  if (!cloud_storage_path) return;

  // New uploads live in Cloudflare R2.
  if (isR2Key(cloud_storage_path)) {
    await deleteFromR2(cloud_storage_path);
    return;
  }

  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}
