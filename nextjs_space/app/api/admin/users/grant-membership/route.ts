import { NextRequest } from 'next/server'
import { POST as grantMembership } from '../../membership-grants/route'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/users/grant-membership — Flutter istemci sözleşmesi için ince alias.
// Gövdeyi (tier/membership/membershipTier, days/duration/durationDays, reason/note) backend'in
// beklediği şekle (userId, tierKey, durationDays, note) normalize eder ve mevcut, yetki denetimli
// membership-grants POST mantığını aynen çağırır. Doğrudan kullanıcı kaydına yazılmaz.
const DURATION_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 }

export async function PATCH(req: NextRequest) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const tierKey = body.tierKey ?? body.tier ?? body.membershipTier ?? body.membership
  const rawDays = body.durationDays ?? body.days
  const durationDays =
    rawDays !== undefined && rawDays !== null
      ? Number(rawDays)
      : DURATION_DAYS[String(body.duration ?? body.period ?? '')] ?? undefined

  const normalized = {
    userId: body.userId,
    tierKey,
    durationDays,
    note: body.note ?? body.reason ?? undefined,
    source: body.source,
    transactionId: body.transactionId,
    autoRenew: body.autoRenew,
  }

  // Gövde değiştiği için orijinal content-length taşınmaz.
  const headers = new Headers(req.headers)
  headers.delete('content-length')
  headers.set('content-type', 'application/json')

  const inner = new NextRequest(new URL(req.url), {
    method: 'POST',
    headers,
    body: JSON.stringify(normalized),
  })
  return grantMembership(inner)
}
