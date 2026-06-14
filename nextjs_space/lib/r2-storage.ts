import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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
