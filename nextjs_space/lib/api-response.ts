/**
 * Standart API yanıt sarmalayıcısı ve hata kodları.
 * 
 * Mevcut route'lar bu dosyayı kullanmak ZORUNDA DEĞİL — geriye dönük uyumluluk
 * için eski format ({error:'...'}) çalışmaya devam eder. Yeni uçlar ve kademeli
 * olarak mobil-kritik uçlar bu zarfa geçirilecektir.
 * 
 * Zarf formatı:
 * {
 *   success: boolean,
 *   data?: T,
 *   error?: { code: string, message: string, details?: any },
 *   meta?: { page?, limit?, total?, cursor?, hasMore? },
 *   request_id?: string
 * }
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// ─── Hata Kodları ───
export const ErrorCodes = {
  // Genel
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_BANNED: 'ACCOUNT_BANNED',

  // Kullanıcı
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_TAKEN: 'EMAIL_ALREADY_TAKEN',
  USERNAME_ALREADY_TAKEN: 'USERNAME_ALREADY_TAKEN',

  // Cüzdan / Finans
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  WITHDRAWAL_NOT_ELIGIBLE: 'WITHDRAWAL_NOT_ELIGIBLE',
  WITHDRAWAL_LIMIT_EXCEEDED: 'WITHDRAWAL_LIMIT_EXCEEDED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',

  // Oda / Yayın
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_CLOSED: 'ROOM_CLOSED',
  SEAT_OCCUPIED: 'SEAT_OCCUPIED',
  SEAT_NOT_FOUND: 'SEAT_NOT_FOUND',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
  STREAM_ENDED: 'STREAM_ENDED',

  // Hediye
  GIFT_NOT_FOUND: 'GIFT_NOT_FOUND',
  GIFT_UNAVAILABLE: 'GIFT_UNAVAILABLE',
  GIFT_SEND_FAILED: 'GIFT_SEND_FAILED',

  // PK
  PK_NOT_FOUND: 'PK_NOT_FOUND',
  PK_ALREADY_ACTIVE: 'PK_ALREADY_ACTIVE',
  PK_NOT_ACTIVE: 'PK_NOT_ACTIVE',
  PK_INVITE_EXPIRED: 'PK_INVITE_EXPIRED',

  // Üyelik
  MEMBERSHIP_ALREADY_ACTIVE: 'MEMBERSHIP_ALREADY_ACTIVE',
  MEMBERSHIP_NOT_FOUND: 'MEMBERSHIP_NOT_FOUND',

  // Feature
  FEATURE_DISABLED: 'FEATURE_DISABLED',

  // Dosya / Medya
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // Moderasyon
  USER_MUTED: 'USER_MUTED',
  USER_BANNED: 'USER_BANNED',
  CONTENT_BLOCKED: 'CONTENT_BLOCKED',
  SPEAK_BLOCKED: 'SPEAK_BLOCKED',

  // Ajans
  AGENCY_NOT_FOUND: 'AGENCY_NOT_FOUND',
  AGENCY_ALREADY_MEMBER: 'AGENCY_ALREADY_MEMBER',

  // Fal
  FORTUNE_LIMIT_REACHED: 'FORTUNE_LIMIT_REACHED',
  TELLER_NOT_AVAILABLE: 'TELLER_NOT_AVAILABLE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  NOT_A_TELLER: 'NOT_A_TELLER',
  INVALID_FORTUNE_TYPE: 'INVALID_FORTUNE_TYPE',

  // Genel İstek
  INVALID_PARAMS: 'INVALID_PARAMS',
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_BODY: 'INVALID_BODY',
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_OP: 'INVALID_OP',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_CONTENT: 'INVALID_CONTENT',
  INVALID_FORM: 'INVALID_FORM',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  MISSING_KEY: 'MISSING_KEY',
  MISSING_OP: 'MISSING_OP',
  ENDPOINT_NOT_FOUND: 'ENDPOINT_NOT_FOUND',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  NOT_OWNER: 'NOT_OWNER',
  COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
  NOT_APPROVED: 'NOT_APPROVED',
  ACCOUNT_RESTRICTED: 'ACCOUNT_RESTRICTED',
  REGISTER_FAILED: 'REGISTER_FAILED',

  // Oda Ek
  ROOM_INACTIVE: 'ROOM_INACTIVE',
  SEAT_TAKEN: 'SEAT_TAKEN',
  INVALID_SEAT: 'INVALID_SEAT',
  INVALID_ROOM_TYPE: 'INVALID_ROOM_TYPE',
  INVALID_ROOM_PASSWORD: 'INVALID_ROOM_PASSWORD',
  CANNOT_SPEAK: 'CANNOT_SPEAK',
  FOLLOWERS_ONLY: 'FOLLOWERS_ONLY',
  COMMENTS_OFF: 'COMMENTS_OFF',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  MISSING_ROOM_ID: 'MISSING_ROOM_ID',
  MISSING_CHANNEL: 'MISSING_CHANNEL',

  // Yayın Ek
  STREAM_NOT_LIVE: 'STREAM_NOT_LIVE',
  ALREADY_LIVE: 'ALREADY_LIVE',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  MISSING_VIDEO: 'MISSING_VIDEO',
  MISSING_VIDEO_URL: 'MISSING_VIDEO_URL',
  TRTC_NOT_CONFIGURED: 'TRTC_NOT_CONFIGURED',
  PRESIGN_FAILED: 'PRESIGN_FAILED',
  TARGET_INACTIVE: 'TARGET_INACTIVE',

  // PK Ek
  PK_EXISTS: 'PK_EXISTS',
  PK_EXPIRED: 'PK_EXPIRED',
  PK_NOT_PENDING: 'PK_NOT_PENDING',
  NO_TARGET_OWNER: 'NO_TARGET_OWNER',
  MISSING_BATTLE_ID: 'MISSING_BATTLE_ID',

  // Hediye Ek
  SELF_GIFT: 'SELF_GIFT',
  NO_RECIPIENT: 'NO_RECIPIENT',
  RECIPIENT_NOT_FOUND: 'RECIPIENT_NOT_FOUND',
  INVALID_GIFT: 'INVALID_GIFT',
  INVALID_PARENT: 'INVALID_PARENT',
  BANNED: 'BANNED',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ─── Request ID ───

/**
 * İstek ID'sini al: middleware tarafından eklenen x-request-id header'ını okur.
 * Yoksa yeni bir tane üretir.
 */
export function getRequestId(): string {
  try {
    const h = headers()
    return h.get('x-request-id') || generateId()
  } catch {
    return generateId()
  }
}

function generateId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

// ─── Yanıt Oluşturucular ───

interface ApiMeta {
  page?: number
  limit?: number
  total?: number
  cursor?: string | null
  hasMore?: boolean
}

/**
 * Başarılı yanıt.
 * Mevcut formatla uyumlu: eski alanlar (`error` yok) + yeni `success`/`request_id`
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>
): NextResponse {
  const body: Record<string, any> = {
    success: true,
    data,
    request_id: getRequestId(),
  }
  return NextResponse.json(body, {
    status,
    headers: extraHeaders,
  })
}

/**
 * Sayfalı başarılı yanıt.
 */
export function apiPaginated<T>(
  data: T[],
  meta: ApiMeta,
  status = 200,
  extraHeaders?: Record<string, string>
): NextResponse {
  const body = {
    success: true,
    data,
    meta,
    request_id: getRequestId(),
  }
  return NextResponse.json(body, {
    status,
    headers: extraHeaders,
  })
}

/**
 * Hata yanıtı.
 * Zarf: { success: false, error: { code, message, details? }, request_id }
 * Ayrıca geriye dönük uyumluluk için üst düzey `error` string'i de eklenir.
 */
export function apiError(
  code: ErrorCode | string,
  message: string,
  status = 400,
  details?: any
): NextResponse {
  const body: Record<string, any> = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
    request_id: getRequestId(),
  }
  return NextResponse.json(body, { status })
}

// ─── Kısayollar ───

export function apiUnauthorized(message = 'Oturum açmanız gerekiyor') {
  return apiError(ErrorCodes.UNAUTHORIZED, message, 401)
}

export function apiForbidden(message = 'Bu işlem için yetkiniz yok') {
  return apiError(ErrorCodes.FORBIDDEN, message, 403)
}

export function apiNotFound(message = 'Kaynak bulunamadı') {
  return apiError(ErrorCodes.NOT_FOUND, message, 404)
}

export function apiValidation(message: string, details?: any) {
  return apiError(ErrorCodes.VALIDATION_ERROR, message, 400, details)
}

export function apiRateLimited(message = 'Çok fazla istek gönderdiniz, lütfen bekleyin') {
  return apiError(ErrorCodes.RATE_LIMITED, message, 429)
}

export function apiInternalError(message = 'Beklenmeyen bir hata oluştu') {
  return apiError(ErrorCodes.INTERNAL_ERROR, message, 500)
}
