/**
 * Immutable Financial Ledger — lib/ledger.ts
 *
 * Double-entry bookkeeping helpers. Every financial movement creates
 * paired debit+credit entries sharing a transactionId.
 *
 * RULES:
 *  - Entries are APPEND-ONLY. Never update/delete a LedgerEntry row.
 *  - Use recordLedger() for simple 1-to-1 transfers.
 *  - Use recordMultiLeg() for multi-party splits (e.g. gift with commission).
 *  - Helpers never throw — they log errors and return silently so the
 *    main business flow is never interrupted.
 *  - balanceBefore/balanceAfter are best-effort snapshots; the source
 *    of truth is still the User model's jetonBalance/cfcBalance.
 */

import prisma from '@/lib/db'
import { v4 as uuidv4 } from 'uuid' // cuid fallback below if uuid not available

// ─── Types ─────────────────────────────────────────────

export type AccountType =
  | 'user_jeton'
  | 'user_cfc'
  | 'platform_jeton'
  | 'platform_cfc'
  | 'agency_jeton'
  | 'teller_earning'

export type LedgerCategory =
  | 'gift_send'
  | 'gift_receive'
  | 'withdrawal'
  | 'purchase'
  | 'fortune_session'
  | 'daily_bonus'
  | 'commission'
  | 'admin_adjust'
  | 'refund'
  | 'game'
  | 'room_create'
  | 'song_request'
  | 'tip'
  | 'membership'
  | 'streak_bonus'
  | 'task_reward'
  | 'welcome_bonus'
  | 'ad_reward'
  | 'referral'
  | 'lucky_gift'
  | 'pk_reward'
  | 'tournament_reward'
  | 'leaderboard_reward'

export type Currency = 'jeton' | 'cfc' | 'tl'

export interface LedgerLeg {
  accountType: AccountType
  accountId: string
  direction: 'debit' | 'credit'
  amount: number
  currency?: Currency
  balanceBefore?: number
  balanceAfter?: number
}

export interface LedgerParams {
  category: LedgerCategory
  description?: string
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, any>
  actorId?: string
  currency?: Currency
}

// ─── Helpers ───────────────────────────────────────────

function generateTxId(): string {
  try {
    return `txn_${uuidv4().replace(/-/g, '').slice(0, 20)}`
  } catch {
    return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Record a simple two-sided ledger entry (one debit, one credit).
 * Used for straightforward transfers: user→platform, platform→user, etc.
 *
 * @example
 * await recordLedger({
 *   debit:  { accountType: 'user_jeton', accountId: senderId, balanceBefore: 100, balanceAfter: 90 },
 *   credit: { accountType: 'user_jeton', accountId: receiverId, balanceBefore: 50, balanceAfter: 60 },
 *   amount: 10,
 *   category: 'gift_send',
 *   referenceType: 'GiftEvent',
 *   referenceId: giftEvent.id,
 * })
 */
export async function recordLedger(params: {
  debit: { accountType: AccountType; accountId: string; balanceBefore?: number; balanceAfter?: number }
  credit: { accountType: AccountType; accountId: string; balanceBefore?: number; balanceAfter?: number }
  amount: number
  category: LedgerCategory
  currency?: Currency
  description?: string
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, any>
  actorId?: string
}): Promise<string | null> {
  try {
    const txId = generateTxId()
    const currency = params.currency || 'jeton'
    const now = new Date()

    await prisma.ledgerEntry.createMany({
      data: [
        {
          transactionId: txId,
          accountType: params.debit.accountType,
          accountId: params.debit.accountId,
          direction: 'debit',
          amount: params.amount,
          currency,
          balanceBefore: params.debit.balanceBefore ?? 0,
          balanceAfter: params.debit.balanceAfter ?? 0,
          category: params.category,
          description: params.description || null,
          referenceType: params.referenceType || null,
          referenceId: params.referenceId || null,
          metadata: params.metadata || undefined,
          actorId: params.actorId || null,
          createdAt: now,
        },
        {
          transactionId: txId,
          accountType: params.credit.accountType,
          accountId: params.credit.accountId,
          direction: 'credit',
          amount: params.amount,
          currency,
          balanceBefore: params.credit.balanceBefore ?? 0,
          balanceAfter: params.credit.balanceAfter ?? 0,
          category: params.category,
          description: params.description || null,
          referenceType: params.referenceType || null,
          referenceId: params.referenceId || null,
          metadata: params.metadata || undefined,
          actorId: params.actorId || null,
          createdAt: now,
        },
      ],
    })

    return txId
  } catch (err) {
    console.error('[Ledger] recordLedger failed:', err)
    return null
  }
}

/**
 * Record a multi-leg ledger transaction (e.g. gift with platform commission + room owner share).
 * All legs share a single transactionId. Sum of debits should equal sum of credits.
 */
export async function recordMultiLeg(params: {
  legs: LedgerLeg[]
  category: LedgerCategory
  currency?: Currency
  description?: string
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, any>
  actorId?: string
}): Promise<string | null> {
  try {
    const txId = generateTxId()
    const currency = params.currency || 'jeton'
    const now = new Date()

    await prisma.ledgerEntry.createMany({
      data: params.legs.map((leg) => ({
        transactionId: txId,
        accountType: leg.accountType,
        accountId: leg.accountId,
        direction: leg.direction,
        amount: leg.amount,
        currency: leg.currency || currency,
        balanceBefore: leg.balanceBefore ?? 0,
        balanceAfter: leg.balanceAfter ?? 0,
        category: params.category,
        description: params.description || null,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
        metadata: params.metadata || undefined,
        actorId: params.actorId || null,
        createdAt: now,
      })),
    })

    return txId
  } catch (err) {
    console.error('[Ledger] recordMultiLeg failed:', err)
    return null
  }
}

/**
 * Get ledger entries for an account (paginated, most recent first).
 */
export async function getAccountLedger(
  accountId: string,
  opts?: { accountType?: string; limit?: number; cursor?: string; category?: string }
) {
  const limit = opts?.limit || 50
  const where: any = { accountId }
  if (opts?.accountType) where.accountType = opts.accountType
  if (opts?.category) where.category = opts.category
  if (opts?.cursor) where.createdAt = { lt: new Date(opts.cursor) }

  return prisma.ledgerEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get all legs of a specific transaction.
 */
export async function getTransaction(transactionId: string) {
  return prisma.ledgerEntry.findMany({
    where: { transactionId },
    orderBy: { createdAt: 'asc' },
  })
}
