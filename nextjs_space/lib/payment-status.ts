/**
 * Ödeme bildirimi durum/ürün etiketleri (spec §82-83).
 * Backend kanonik etiket üretir; frontend tahmin etmez.
 */

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'corrected'
  | 'cancelled'
  | 'refunded'

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  corrected: 'Düzeltilerek Onaylandı',
  cancelled: 'İptal Edildi',
  refunded: 'İade Edildi',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  corrected: 'blue',
  cancelled: 'gray',
  refunded: 'orange',
}

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  jeton: 'Jeton',
  cfc: 'CFC',
  gold: 'Gold Üyelik',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  papara: 'Papara',
  bank_transfer: 'Banka Transferi',
  whatsapp: 'WhatsApp',
  havale: 'Havale/EFT',
  eft: 'Havale/EFT',
  card: 'Kredi Kartı',
}

/** Açıklama yoksa gösterilecek varsayılan admin mesajı (spec §76). */
export const DEFAULT_ADMIN_NOTES: Record<string, string> = {
  approved: 'Ödemeniz onaylandı ve bakiyenize tanımlandı.',
  rejected:
    'Ödemeniz doğrulanamadığı için reddedildi. Detay için bizimle iletişime geçebilirsiniz.',
  corrected:
    'Ödemeniz, tespit edilen tutar üzerinden düzeltilerek onaylandı.',
  cancelled: 'Ödeme bildiriminiz iptal edildi.',
  refunded: 'Ödemeniz iade edildi.',
  pending: 'Ödemeniz inceleniyor, kısa süre içinde sonuçlandırılacak.',
}

function methodLabel(method?: string | null): string {
  if (!method) return '-'
  return PAYMENT_METHOD_LABELS[method] || method
}

/** Kullanıcıya gösterilen yüklenen miktar özeti. */
function loadedSummary(n: any): string | null {
  if (n.productType === 'gold') {
    if (n.goldDaysLoaded) {
      return `${n.goldDaysLoaded} gün Gold${n.goldTypeLoaded ? ` (${n.goldTypeLoaded})` : ''}`
    }
    return null
  }
  if (n.productType === 'cfc') {
    return n.cfcLoaded != null ? `${n.cfcLoaded} CFC` : null
  }
  return n.jetonLoaded != null ? `${n.jetonLoaded} Jeton` : null
}

/** Kullanıcının talep ettiği miktar özeti. */
function requestedSummary(n: any): string | null {
  if (n.productType === 'gold') {
    if (n.requestedGoldDays) {
      return `${n.requestedGoldDays} gün Gold${n.requestedGoldType ? ` (${n.requestedGoldType})` : ''}`
    }
    return null
  }
  if (n.requestedAmount == null) return null
  return `${n.requestedAmount} ${n.productType === 'cfc' ? 'CFC' : 'Jeton'}`
}

/**
 * Ham PaymentNotification kaydını kullanıcıya gösterilecek hale getirir.
 * Mevcut alanlar korunur, sadece yeni alanlar eklenir (geriye dönük uyumlu).
 */
export function decoratePaymentNotification(n: any) {
  const status = String(n.status || 'pending')
  const productType = String(n.productType || 'jeton')
  const isCorrected =
    status === 'corrected' ||
    (n.correctedAmount != null && n.correctedAmount !== n.originalRequestedAmount)

  return {
    ...n,
    statusLabel: PAYMENT_STATUS_LABELS[status] || status,
    statusColor: PAYMENT_STATUS_COLORS[status] || 'gray',
    productLabel: PRODUCT_TYPE_LABELS[productType] || productType,
    paymentMethodLabel: methodLabel(n.paymentMethod),
    requestedSummary: requestedSummary(n),
    loadedSummary: loadedSummary(n),
    // Açıklama yoksa default mesaj (spec §76)
    adminMessage: (n.adminNote && String(n.adminNote).trim()) || DEFAULT_ADMIN_NOTES[status] || null,
    wasCorrected: isCorrected,
    // İtiraz yalnızca olumsuz sonuçlarda anlamlı (spec §84)
    canDispute: status === 'rejected' || status === 'corrected' || status === 'cancelled',
    isFinal: status !== 'pending',
  }
}
