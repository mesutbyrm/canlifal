/**
 * Server-side helpers to derive a poster thumbnail for a video gift.
 *
 * New gift uploads go straight to Cloudflare R2 via a presigned URL, so the
 * server never holds the file bytes. To create a poster frame we hand the
 * public video URL to the Abacus.AI FFmpeg API (ffmpeg is not available in the
 * production runtime) and store the resulting CDN URL as the gift thumbnail.
 *
 * Everything here is best-effort: if the FFmpeg API is slow or fails, the
 * caller must continue without a thumbnail so gift creation never breaks.
 */

const FFMPEG_CREATE = 'https://apps.abacus.ai/api/createRunFfmpegCommandRequest'
const FFMPEG_STATUS = 'https://apps.abacus.ai/api/getRunFfmpegCommandStatus'

/**
 * Generate a JPEG poster frame from the first second of a video and return the
 * permanent CDN URL of the generated image. Returns null on any failure.
 *
 * @param videoUrl A publicly accessible video URL (must be reachable by FFmpeg).
 * @param maxWaitMs How long to poll before giving up (default 45s).
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  maxWaitMs = 45000,
): Promise<string | null> {
  const token = process.env.ABACUSAI_API_KEY
  if (!token || !videoUrl || !/^https?:\/\//i.test(videoUrl)) return null

  try {
    const createRes = await fetch(FFMPEG_CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: token,
        input_files: { in_1: videoUrl },
        output_files: { out_1: 'gift-thumb.jpg' },
        // Grab a single frame ~0.1s in, scaled to a reasonable poster size while
        // preserving aspect ratio (-1 keeps ratio, force even height).
        ffmpeg_command: "-ss 00:00:00.1 -i {{in_1}} -frames:v 1 -vf scale=512:-2 -q:v 3 {{out_1}}",
        max_command_run_seconds: 60,
      }),
    })
    if (!createRes.ok) return null
    const { request_id } = await createRes.json()
    if (!request_id) return null

    const deadline = Date.now() + maxWaitMs
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500))
      const statusRes = await fetch(FFMPEG_STATUS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: token }),
      })
      if (!statusRes.ok) continue
      const statusResult = await statusRes.json().catch(() => null)
      const status = statusResult?.status || 'FAILED'
      if (status === 'SUCCESS') {
        const url = statusResult?.result?.result?.out_1
        return typeof url === 'string' && url ? url : null
      }
      if (status === 'FAILED') return null
      // else PROCESSING -> keep polling
    }
    return null
  } catch (e) {
    console.error('[gift-media-probe] thumbnail generation failed:', e)
    return null
  }
}
