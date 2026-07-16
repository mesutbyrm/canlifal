/**
 * Standard API Response Wrapper for Flutter + Web consistency.
 * All API endpoints should use these helpers to ensure
 * consistent response format across the entire application.
 *
 * SUCCESS:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... },
 *   "pagination": { ... } | null,
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "requestId": "uuid"
 * }
 *
 * ERROR:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Açıklama",
 *     "details": []
 *   },
 *   "timestamp": "2024-01-01T00:00:00.000Z",
 *   "requestId": "uuid"
 * }
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// ─── Types ───────────────────────────────────────────────────

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiSuccessResponse<T = any> {
  success: true
  message: string
  data: T
  pagination: ApiPagination | null
  timestamp: string
  requestId: string
}

export interface ApiErrorDetail {
  field?: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details: ApiErrorDetail[]
  }
  timestamp: string
  requestId: string
}

// ─── Error Codes ─────────────────────────────────────────────

export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  // Resource
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  // Business
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  INSUFFICIENT_JETONS: 'INSUFFICIENT_JETONS',
  RATE_LIMITED: 'RATE_LIMITED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// ─── Helpers ─────────────────────────────────────────────────

function generateRequestId(): string {
  return randomUUID()
}

function getTimestamp(): string {
  return new Date().toISOString()
}

// ─── Success Responses ───────────────────────────────────────

/**
 * Return a standard success response.
 *
 * @param data - The response payload
 * @param message - Optional human-readable message
 * @param status - HTTP status code (default 200)
 * @param pagination - Optional pagination metadata
 */
export function apiSuccess<T = any>(
  data: T,
  message: string = 'Başarılı',
  status: number = 200,
  pagination?: ApiPagination | null
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      message,
      data,
      pagination: pagination ?? null,
      timestamp: getTimestamp(),
      requestId: generateRequestId(),
    },
    { status }
  )
}

/**
 * Paginated success helper.
 * Automatically calculates totalPages, hasNext, hasPrev.
 */
export function apiPaginated<T = any>(
  data: T,
  page: number,
  limit: number,
  total: number,
  message: string = 'Başarılı'
): NextResponse<ApiSuccessResponse<T>> {
  const totalPages = Math.ceil(total / limit)
  return apiSuccess(data, message, 200, {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  })
}

// ─── Error Responses ─────────────────────────────────────────

/**
 * Return a standard error response.
 */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details: ApiErrorDetail[] = []
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: { code, message, details },
      timestamp: getTimestamp(),
      requestId: generateRequestId(),
    },
    { status }
  )
}

// Convenience shortcuts

export function apiUnauthorized(message: string = 'Oturum açmanız gerekiyor') {
  return apiError(ErrorCodes.UNAUTHORIZED, message, 401)
}

export function apiForbidden(message: string = 'Bu işlem için yetkiniz yok') {
  return apiError(ErrorCodes.FORBIDDEN, message, 403)
}

export function apiNotFound(message: string = 'Kayıt bulunamadı') {
  return apiError(ErrorCodes.NOT_FOUND, message, 404)
}

export function apiValidationError(message: string, details: ApiErrorDetail[] = []) {
  return apiError(ErrorCodes.VALIDATION_ERROR, message, 400, details)
}

export function apiRateLimited(message: string = 'Çok fazla istek. Lütfen biraz bekleyin.') {
  return apiError(ErrorCodes.RATE_LIMITED, message, 429)
}

export function apiInsufficientCredits(message: string = 'Yetersiz kredi') {
  return apiError(ErrorCodes.INSUFFICIENT_CREDITS, message, 402)
}

export function apiInsufficientJetons(message: string = 'Yetersiz jeton') {
  return apiError(ErrorCodes.INSUFFICIENT_JETONS, message, 402)
}

export function apiInternalError(message: string = 'Sunucu hatası') {
  return apiError(ErrorCodes.INTERNAL_ERROR, message, 500)
}
