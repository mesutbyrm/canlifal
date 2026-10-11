/**
 * BÖLÜM 21 / A2 — Kullanıcı zaman çizelgesi (UserTimelineEvent) yardımcıları.
 * Asla throw etmez; kayıt başarısız olursa sessizce loglar.
 */
import prisma from '@/lib/db'

export type TimelineEventInput = {
  userId: string
  type: string
  title: string
  description?: string | null
  metadata?: any
  occurredAt?: Date
}

export async function recordTimelineEvent(input: TimelineEventInput): Promise<void> {
  try {
    await prisma.userTimelineEvent.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        metadata: input.metadata != null ? JSON.stringify(input.metadata) : null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    })
  } catch (e) {
    console.error('[UserTimeline] record failed:', e)
  }
}

/** Fire-and-forget sarmalayıcı. */
export function recordTimelineEventSafe(input: TimelineEventInput): void {
  recordTimelineEvent(input).catch(() => {})
}

export async function getUserTimeline(userId: string, opts?: { page?: number; limit?: number; type?: string }) {
  const page = Math.max(1, opts?.page ?? 1)
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 30))
  const where: any = { userId }
  if (opts?.type) where.type = opts.type
  const [items, total] = await Promise.all([
    prisma.userTimelineEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.userTimelineEvent.count({ where }),
  ])
  return { items, total, page, limit }
}
