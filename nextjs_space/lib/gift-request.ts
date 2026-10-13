'use client'

const pending = new Map<string, Promise<Response>>()
/** Reuse the same key after a lost response, including a page reload. No token
 * or credential is stored; the server still authenticates each request. */
export async function postGift(url: string, body: Record<string, unknown>, userId: string): Promise<Response> {
  const fingerprint = `gift-request:${userId}:${url}:${JSON.stringify(body)}`
  const active = pending.get(fingerprint)
  if (active) return (await active).clone()
  const send = (async () => {
    let key: string | null = null
    try { key = sessionStorage.getItem(fingerprint) } catch {}
    if (!key) key = crypto.randomUUID()
    try { sessionStorage.setItem(fingerprint, key) } catch {}
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) })
    if (response.ok || [400, 401, 403, 404].includes(response.status)) {
      try { sessionStorage.removeItem(fingerprint) } catch {}
    }
    return response
  })()
  pending.set(fingerprint, send)
  try { return (await send).clone() } finally { pending.delete(fingerprint) }
}
