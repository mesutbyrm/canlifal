import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Catch-all fallback for unknown API paths.
 *
 * Without it, a single-segment unknown path such as /api/foo was captured by
 * the [lang]/[customSlug] page route and answered with 200 + HTML, which is
 * wrong for an API client. Next.js always prefers static and dynamic segment
 * routes over a catch-all, so every real endpoint keeps its own handler and
 * only genuinely unknown paths reach this file.
 */
function notFound() {
  return NextResponse.json(
    {
      error: 'Uç nokta bulunamadı',
      errorEn: 'Endpoint not found',
      code: 'ENDPOINT_NOT_FOUND'
    },
    { status: 404 }
  )
}

export async function GET() { return notFound() }
export async function POST() { return notFound() }
export async function PUT() { return notFound() }
export async function PATCH() { return notFound() }
export async function DELETE() { return notFound() }
export async function HEAD() { return notFound() }
export async function OPTIONS() { return notFound() }
