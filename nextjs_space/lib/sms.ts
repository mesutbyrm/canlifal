/**
 * lib/sms.ts — Geriye dönük uyumluluk katmanı.
 *
 * Gerçek mantık `lib/sms/service.ts` + `lib/sms/adapters.ts` içindedir.
 * Bu dosya yalnız eski çağrı noktalarının bozulmaması için korunur.
 */

import { isSmsConfiguredAsync, sendSmsMessage, resolveProviderChain } from '@/lib/sms/service'

type SmsResult = { ok: boolean; reason?: string; providerId?: string }

/** @deprecated Çoklu sağlayıcı mimarisinde tek sağlayıcı kavramı yoktur. */
export function getSmsProvider(): string {
  return (process.env.SMS_PROVIDER || '').toLowerCase().trim()
}

/** Yeni mimaride yapılandırma veritabanındadır → asenkron kontrol kullanın. */
export async function isSmsConfigured(): Promise<boolean> {
  return isSmsConfiguredAsync()
}

export { isSmsConfiguredAsync, resolveProviderChain }

// E.164 / yerel format normalizasyonu (Türkiye varsayılanı).
export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[^0-9+]/g, '')
  if (!p) return ''
  if (p.startsWith('+')) return p
  if (p.startsWith('00')) return '+' + p.slice(2)
  if (p.startsWith('0')) return '+90' + p.slice(1)
  if (p.startsWith('90')) return '+' + p
  if (p.length === 10) return '+90' + p // 10 haneli çıplak numara -> TR
  return p
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const normalized = normalizePhone(phone)
  if (!normalized) return { ok: false, reason: 'invalid_phone' }
  const out = await sendSmsMessage(normalized, message)
  return { ok: out.ok, reason: out.ok ? undefined : out.errorCode, providerId: out.providerMessageId }
}
