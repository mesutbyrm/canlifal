/**
 * Audit Log — lib/audit-log.ts
 *
 * Append-only audit trail for admin & system actions.
 * Never throws — logs errors to console and returns silently.
 */

import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

export interface AuditParams {
  actorId: string
  actorRole?: string
  action: string
  targetType?: string
  targetId?: string
  before?: Record<string, any> | null
  after?: Record<string, any> | null
  description?: string
  metadata?: Record<string, any>
  ip?: string
}

/**
 * Record an audit log entry.
 * @returns The created AuditLog id, or null on failure.
 */
export async function recordAudit(params: AuditParams): Promise<string | null> {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole || null,
        actorIp: params.ip || null,
        action: params.action,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        before: params.before || undefined,
        after: params.after || undefined,
        description: params.description || null,
        metadata: params.metadata || undefined,
      },
    })
    return entry.id
  } catch (err) {
    console.error('[AuditLog] recordAudit failed:', err)
    return null
  }
}

/**
 * Convenience: extract client IP from NextRequest for audit entries.
 */
export function getAuditIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Get recent audit log entries (paginated, most recent first).
 */
export async function getAuditLogs(opts?: {
  actorId?: string
  action?: string
  targetType?: string
  targetId?: string
  limit?: number
  cursor?: string
}) {
  const limit = opts?.limit || 50
  const where: any = {}
  if (opts?.actorId) where.actorId = opts.actorId
  if (opts?.action) where.action = opts.action
  if (opts?.targetType) where.targetType = opts.targetType
  if (opts?.targetId) where.targetId = opts.targetId
  if (opts?.cursor) where.createdAt = { lt: new Date(opts.cursor) }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
