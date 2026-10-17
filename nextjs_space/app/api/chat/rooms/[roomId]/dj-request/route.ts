import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitDjUpdate } from '@/lib/chat-dj-events'
import {
  DjRequestError,
  actOnDjRequest,
  createDjRequest,
  listRoomDjRequests,
  resolveDjHandlers,
} from '@/lib/dj-requests'

export const dynamic = 'force-dynamic'

/** İstemci oda kimliği yerine bağlantı adını (slug) yollarsa gerçek kimliğe çevir. */
async function resolveRoomId(key: string): Promise<string> {
  const room = await prisma.chatRoom.findFirst({
    where: { OR: [{ id: key }, { slug: key }] },
    select: { id: true },
  })
  return room?.id ?? key
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const mobileUser = await authenticateRequest(req)
  if (mobileUser?.id) return mobileUser.id
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.id ?? null
}

function fail(e: unknown, fallback: string) {
  if (e instanceof DjRequestError) {
    return NextResponse.json({ error: e.message }, { status: e.status })
  }
  console.error(fallback, e)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

// GET: açık DJ istekleri + isteği yanıtlayabilecek kişiler (popup hedefi).
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const roomId = await resolveRoomId(params.roomId)
    const [requests, handlerIds] = await Promise.all([
      listRoomDjRequests(roomId),
      resolveDjHandlers(roomId),
    ])
    return NextResponse.json(
      { ...requests, handlerIds, isHandler: handlerIds.includes(userId) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return fail(e, 'İstekler alınamadı')
  }
}

// POST: { query, jetonSource? } — !istek şarkıcı şarkı
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const roomId = await resolveRoomId(params.roomId)
    const body = await req.json().catch(() => ({}))
    const query = String(body?.query ?? body?.title ?? '').trim()
    const result = await createDjRequest({
      roomId: roomId,
      userId,
      query,
      jetonSource: body?.jetonSource,
      message: typeof body?.message === 'string' ? body.message : undefined,
      giftToUserId: typeof body?.giftToUserId === 'string' ? body.giftToUserId : undefined,
      priority: body?.priority === true,
    })
    await emitDjUpdate(roomId)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return fail(e, 'İstek gönderilemedi')
  }
}

// PATCH: { requestId, action: 'play' | 'reject' | 'cancel' | 'done' | 'clap' }
export async function PATCH(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    const roomId = await resolveRoomId(params.roomId)
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action ?? '')
    if (!['play', 'reject', 'cancel', 'done', 'clap'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    }
    const requestId = String(body?.requestId ?? '')
    if (!requestId) return NextResponse.json({ error: 'İstek kimliği eksik' }, { status: 400 })
    const result = await actOnDjRequest({
      roomId: roomId,
      userId,
      requestId,
      action: action as 'play' | 'reject' | 'cancel' | 'done' | 'clap',
    })
    await emitDjUpdate(roomId)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return fail(e, 'İşlem yapılamadı')
  }
}
