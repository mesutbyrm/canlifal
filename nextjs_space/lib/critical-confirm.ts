/**
 * Kritik admin işlemlerinde ikinci onay (spec §88).
 *
 * Backend güvenliği: frontend onay göstermese bile, kritik işlem
 * `confirm: true` gönderilmeden gerçekleşmez. Yanıt 409 + requiresConfirmation.
 */
import { NextResponse } from 'next/server'
import { getRequestId } from './api-response'

/** Eşikler — bu değerlerin üstü kritik sayılır. */
export const CRITICAL_THRESHOLDS = {
  jeton: 1000,
  cfc: 5000,
  amountTl: 2000,
}

export type CriticalCheck = { required: false } | { required: true; message: string }

function fmt(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(n)
}

/**
 * İşlemin ikinci onay gerektirip gerektirmediğini belirler.
 * Gerekliyse kullanıcıya gösterilecek Türkçe onay metnini döner.
 */
export function checkCritical(action: string, params: Record<string, any> = {}): CriticalCheck {
  const amount = Number(params.amount ?? 0)
  const target = params.targetName ? ` (${params.targetName})` : ''

  switch (action) {
    case 'jeton_adjust':
      if (Math.abs(amount) >= CRITICAL_THRESHOLDS.jeton) {
        return {
          required: true,
          message:
            amount >= 0
              ? `${fmt(Math.abs(amount))} jeton yüklemek istediğinize emin misiniz?${target}`
              : `${fmt(Math.abs(amount))} jeton düşmek istediğinize emin misiniz?${target}`,
        }
      }
      return { required: false }

    case 'cfc_adjust':
      if (Math.abs(amount) >= CRITICAL_THRESHOLDS.cfc) {
        return {
          required: true,
          message:
            amount >= 0
              ? `${fmt(Math.abs(amount))} CFC yüklemek istediğinize emin misiniz?${target}`
              : `${fmt(Math.abs(amount))} CFC düşmek istediğinize emin misiniz?${target}`,
        }
      }
      return { required: false }

    case 'gold_grant':
      return {
        required: true,
        message: `Kullanıcıya${target} ${params.days ? `${params.days} gün ` : ''}Gold üyelik vermek istediğinize emin misiniz?`,
      }

    case 'gold_revoke':
      return {
        required: true,
        message: `Kullanıcının${target} Gold üyeliğini geri almak istediğinize emin misiniz?`,
      }

    case 'ban':
      if (!params.bannedUntil) {
        return {
          required: true,
          message: `Kullanıcıyı${target} KALICI olarak yasaklamak istediğinize emin misiniz?`,
        }
      }
      return { required: false }

    case 'role_change':
      return {
        required: true,
        message: `Kullanıcının${target} rolünü "${params.role || '?'}" olarak değiştirmek istediğinize emin misiniz?`,
      }

    case 'payment_approve':
      return {
        required: true,
        message: `${params.summary || 'Bu ödemeyi'} onaylamak istediğinize emin misiniz? Bakiye anında yüklenecek.`,
      }

    case 'payment_correct':
      return {
        required: true,
        message: `Ödemeyi ${params.summary || ''} olarak düzeltip onaylamak istediğinize emin misiniz?`.replace(
          /\s+/g,
          ' '
        ),
      }

    case 'payment_refund':
      return {
        required: true,
        message: `Bu ödemeyi iade etmek istediğinize emin misiniz? Yüklenen bakiye geri alınacak.`,
      }

    case 'distribute_rewards':
      return {
        required: true,
        message: `Bu dönemin ödüllerini dağıtmak istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      }

    case 'tournament_reward':
      return {
        required: true,
        message: `Turnuva ödüllerini dağıtmak istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      }

    // BÖLÜM 21 / A3 — ajans cüzdanı kritik işlemleri
    case 'agency_wallet_topup':
      return {
        required: true,
        message: `Ajansa${target} ${fmt(Math.abs(amount))} tutarında bakiye yüklemek istediğinize emin misiniz?`,
      }

    case 'agency_wallet_adjust':
      return {
        required: true,
        message: `Ajans${target} cüzdanında ${fmt(Math.abs(amount))} jetonluk düzeltme yapmak istediğinize emin misiniz? Bu işlem yeni bir muhasebe kaydı oluşturur.`,
      }

    case 'agency_wallet_transfer':
      if (Math.abs(amount) >= CRITICAL_THRESHOLDS.jeton) {
        return {
          required: true,
          message: `${fmt(Math.abs(amount))} jetonu${target} göndermek istediğinize emin misiniz?`,
        }
      }
      return { required: false }

    default:
      return { required: false }
  }
}

/**
 * Route içinde tek satırlık kullanım:
 *   const guard = requireConfirmation('gold_grant', body.confirm, { targetName })
 *   if (guard) return guard
 *
 * Onay gerekiyorsa 409 yanıtı, gerekmiyorsa null döner.
 */
export function requireConfirmation(
  action: string,
  confirmed: any,
  params: Record<string, any> = {}
): NextResponse | null {
  if (confirmed === true || confirmed === 'true') return null
  const check = checkCritical(action, params)
  if (!check.required) return null

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'CONFIRMATION_REQUIRED',
        message: check.message,
      },
      requiresConfirmation: true,
      confirmationMessage: check.message,
      action,
      request_id: getRequestId(),
    },
    { status: 409 }
  )
}
