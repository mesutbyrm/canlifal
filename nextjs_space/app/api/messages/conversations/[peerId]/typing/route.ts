import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Yazıyor göstergesi: kalıcı kayıt tutulmaz, süreç içi kısa ömürlü bellek.
type TypingState = { userId: string; until: number }
const typingMap: Map<string, TypingState[]> =
  (globalThis as any).__dmTypingMap || ((globalThis as any).__dmTypingMap = new Map())

const TTL_MS = 6000

function keyFor(a: string, b: string) {
  return [a, b].sort().join(':')
}

function prune(list: TypingState[]) {
  const now = Date.now()
  return list.filter((t) => t.until > now)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const typing = body?.typing !== false
  const key = keyFor(auth.id, params.peerId)
  const list = prune(typingMap.get(key) || []).filter((t) => t.userId !== auth.id)
  if (typing) list.push({ userId: auth.id, until: Date.now() + TTL_MS })
  typingMap.set(key, list)

  const peerTyping = list.some((t) => t.userId === params.peerId)
  return NextResponse.json({ success: true, typing, peerTyping, isTyping: peerTyping })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const key = keyFor(auth.id, params.peerId)
  const list = prune(typingMap.get(key) || [])
  typingMap.set(key, list)
  const peerTyping = list.some((t) => t.userId === params.peerId)
  return NextResponse.json({ typing: peerTyping, peerTyping, isTyping: peerTyping })
}
