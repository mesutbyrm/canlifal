import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'canlifal-shorts'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured')
    }
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return _client
}

export interface UploadResult {
  key: string
  url: string
}

/**
 * Upload a buffer to Cloudflare R2.
 * Returns the CDN public URL and the R2 key.
 */
export async function uploadToR2(
  buffer: Buffer,
  folder: string,
  ext: string,
  contentType: string
): Promise<UploadResult> {
  const client = getClient()
  const fileName = `${uuidv4()}${ext}`
  const key = `${folder}/${fileName}`

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  const url = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
    : `https://${R2_BUCKET_NAME}.r2.dev/${key}`

  return { key, url }
}

/**
 * Build the public CDN URL for a given R2 key.
 */
export function buildPublicUrl(key: string): string {
  return R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
    : `https://${R2_BUCKET_NAME}.r2.dev/${key}`
}

export interface PresignedUpload {
  key: string
  uploadUrl: string
  publicUrl: string
  expiresIn: number
}

/**
 * Create a presigned PUT URL for direct browser -> R2 upload (background upload).
 * The client PUTs the raw bytes to `uploadUrl` with header Content-Type = contentType.
 */
export async function getPresignedUploadUrl(
  folder: string,
  ext: string,
  contentType: string,
  expiresIn = 900
): Promise<PresignedUpload> {
  const client = getClient()
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`
  const key = `${folder}/${uuidv4()}${safeExt}`
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })
  const uploadUrl = await getSignedUrl(client, command, { expiresIn })
  return { key, uploadUrl, publicUrl: buildPublicUrl(key), expiresIn }
}

/**
 * Create a presigned GET URL for a private R2 object (temporary read access).
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient()
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Create a presigned PUT URL from a fileName (derives extension) for direct
 * browser/Flutter -> R2 upload. Returns the legacy { uploadUrl, cloud_storage_path }
 * shape so existing upload clients keep working unchanged.
 */
export async function getPresignedUploadUrlForFile(
  fileName: string,
  contentType: string,
  folder = 'gift/uploads'
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const dot = fileName.lastIndexOf('.')
  const ext = dot >= 0 ? fileName.slice(dot) : ''
  const { key, uploadUrl } = await getPresignedUploadUrl(folder, ext, contentType)
  return { uploadUrl, cloud_storage_path: key }
}

/**
 * Whether a stored cloud_storage_path refers to a Cloudflare R2 object
 * (new uploads) as opposed to a legacy S3 key.
 */
export function isR2Key(cloudStoragePath: string): boolean {
  if (!cloudStoragePath) return false
  return (
    cloudStoragePath.startsWith('gift/') ||
    cloudStoragePath.startsWith('shorts/')
  )
}

/**
 * Delete a file from R2 by key.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient()
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  )
}

/**
 * Extract the R2 key from a full CDN URL.
 */
export function extractR2Key(url: string): string | null {
  if (!url) return null
  // Try removing public URL prefix
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.slice(R2_PUBLIC_URL.replace(/\/$/, '').length + 1)
  }
  // Try removing r2.dev prefix
  const r2DevMatch = url.match(/\.r2\.dev\/(.+)$/)
  if (r2DevMatch) return r2DevMatch[1]
  // Try extracting path after domain
  const match = url.match(/https?:\/\/[^/]+\/(.+)$/)
  return match ? match[1] : null
}
