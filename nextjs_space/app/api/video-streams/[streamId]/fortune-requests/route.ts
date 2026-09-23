import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'

// ── Fal isteği oluşturma: gövde ayrıştırma ve hata eşleme yardımcıları ──
type FortuneCreateBodyOk = {
  ok: true
  typeId: string
  nickname: string | null
  isHidden: boolean
  question: string | null
}
type FortuneCreateBodyError = { ok: false; status: number; body: Record<string, unknown> }
type ParsedFortuneCreateBody = FortuneCreateBodyOk | FortuneCreateBodyError

const invalidBody = (error: string, errorEn: string): FortuneCreateBodyError => ({
  ok: false,
  status: 400,
  body: { error, errorEn, code: 'INVALID_BODY' }
})

/**
 * İstek gövdesini güvenli biçimde ayrıştırır. Bozuk JSON, dizi veya yanlış tipler
 * her zaman 400 döner; hiçbir koşulda istisna fırlatmaz (500 üretmez).
 * Eski (legacy) alan adları kanonik alanlara eşlenir.
 */
async function parseFortuneCreateBody(request: NextRequest): Promise<ParsedFortuneCreateBody> {
  let body: any
  try {
    body = await request.json()
  } catch {
    return invalidBody('Geçersiz istek gövdesi', 'Invalid request body')
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalidBody('Geçersiz istek gövdesi', 'Invalid request body')
  }

  const typeIdRaw = body.typeId ?? body.fortuneTypeId ?? body.requestTypeId ?? body.type_id
  const nicknameRaw = body.nickname ?? body.nickName ?? body.displayName
  const isHiddenRaw = body.isHidden ?? body.hidden ?? body.anonymous
  const questionRaw = body.question ?? body.message ?? body.text

  if (typeof typeIdRaw !== 'string' || typeIdRaw.trim().length === 0) {
    return invalidBody('Fal türü (typeId) gereklidir', 'typeId is required')
  }
  if (nicknameRaw != null && typeof nicknameRaw !== 'string') {
    return invalidBody('Geçersiz takma ad', 'Invalid nickname')
  }
  if (questionRaw != null && typeof questionRaw !== 'string') {
    return invalidBody('Geçersiz soru metni', 'Invalid question')
  }
  if (isHiddenRaw != null && typeof isHiddenRaw !== 'boolean') {
    return invalidBody('Geçersiz gizlilik değeri', 'Invalid isHidden')
  }

  return {
    ok: true,
    typeId: typeIdRaw.trim(),
    nickname: typeof nicknameRaw === 'string' ? (nicknameRaw.trim().slice(0, 60) || null) : null,
    isHidden: isHiddenRaw === true,
    question: typeof questionRaw === 'string' ? (questionRaw.trim().slice(0, 500) || null) : null
  }
}

/**
 * Veritabanı istisnalarını sözleşmeye uygun HTTP durum kodlarına eşler.
 * P2002 (benzersizlik ihlali) -> 409, P2003 (yabancı anahtar ihlali) -> 400,
 * P2025 (kayıt yok) -> 404, diğerleri -> 500.
 */
function mapFortuneCreateException(error: any): { status: number; body: Record<string, unknown> } {
  const code = error?.code
  if (code === 'P2002') {
    return {
      status: 409,
      body: {
        error: 'Zaten bekleyen bir fal isteğiniz var',
        errorEn: 'You already have a pending fortune request',
        code: 'DUPLICATE_REQUEST'
      }
    }
  }
  if (code === 'P2003') {
    return {
      status: 400,
      body: {
        error: 'Geçersiz istek gövdesi',
        errorEn: 'Invalid reference in request body',
        code: 'INVALID_BODY'
      }
    }
  }
  if (code === 'P2025') {
    return {
      status: 404,
      body: { error: 'Yayın bulunamadı', errorEn: 'Stream not found', code: 'STREAM_NOT_FOUND' }
    }
  }
  return {
    status: 500,
    body: {
      error: 'Fal isteği oluşturulamadı',
      errorEn: 'Failed to create fortune request',
      code: 'INTERNAL_ERROR'
    }
  }
}

interface FortuneRequestRecord {
  id: string
  userId: string
  typeId: string | null
  nickname: string | null
  isHidden: boolean
  question: string | null
  jetonAmount: number
  status: string
  createdAt: Date
  type: { name: string; nameEn: string; icon: string } | null
}

interface UserRecord {
  id: string
  name: string
  image: string | null
}

// GET - List fortune requests for a stream (sorted by jeton amount)
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const requests = await prisma.streamFortuneRequest.findMany({
      where: { 
        streamId: params.streamId,
        status: 'pending'
      },
      include: {
        type: { select: { name: true, nameEn: true, icon: true } }
      },
      orderBy: { jetonAmount: 'desc' }
    })
    
    // Fetch user details for each request
    const userIds = requests.map((r: FortuneRequestRecord) => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })
    const userMap = new Map(users.map((u: UserRecord) => [u.id, u]))
    
    const result = requests.map((r: FortuneRequestRecord) => ({
      id: r.id,
      userId: r.userId,
      typeId: r.typeId,
      typeName: r.type?.name || 'Genel Soru',
      typeNameEn: r.type?.nameEn || 'General Question',
      typeIcon: r.type?.icon || '☕',
      nickname: r.nickname,
      isHidden: r.isHidden,
      question: r.question,
      jetonAmount: r.jetonAmount,
      createdAt: r.createdAt,
      user: userMap.get(r.userId) || { name: 'Unknown', image: null }
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error fetching fortune requests:', error)
    return NextResponse.json({ error: 'Failed to fetch fortune requests' }, { status: 500 })
  }
}

// POST - Create a fortune request (deducts jetons)
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    // --- Gövde ayrıştırma (bozuk JSON -> 400, asla 500) ---
    const parsed = await parseFortuneCreateBody(request)
    if (parsed.ok !== true) {
      const err = parsed as FortuneCreateBodyError
      return NextResponse.json(err.body, { status: err.status })
    }
    const { typeId, nickname, isHidden, question } = parsed as FortuneCreateBodyOk

    // --- Yayın var mı? (geçersiz streamId -> 404) ---
    if (!params.streamId || params.streamId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Yayın bulunamadı', errorEn: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }
    const targetStream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true }
    })
    if (!targetStream) {
      return NextResponse.json(
        { error: 'Yayın bulunamadı', errorEn: 'Stream not found', code: 'STREAM_NOT_FOUND' },
        { status: 404 }
      )
    }
    
    // Check if user already has a pending request for this stream
    const existingRequest = await prisma.streamFortuneRequest.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: authUser.id
        }
      }
    })
    
    if (existingRequest && existingRequest.status === 'pending') {
      return NextResponse.json({ 
        error: 'Zaten bekleyen bir fal isteğiniz var', 
        errorEn: 'You already have a pending fortune request',
        code: 'DUPLICATE_REQUEST'
      }, { status: 409 })
    }
    
    // Get fortune request type and cost
    const fortuneType = await prisma.fortuneRequestType.findUnique({
      where: { id: typeId }
    })
    
    if (!fortuneType || !fortuneType.isActive) {
      return NextResponse.json({ 
        error: 'Geçersiz fal türü', 
        errorEn: 'Invalid fortune type',
        code: 'INVALID_FORTUNE_TYPE'
      }, { status: 400 })
    }
    
    // Check user's jeton balance
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { jetonBalance: true, role: true }
    })
    const isStaff = user?.role === 'yonetici'
    
    if (!user || (!isStaff && user.jetonBalance < fortuneType.jetonCost)) {
      return NextResponse.json({ 
        error: 'Yetersiz jeton bakiyesi', 
        errorEn: 'Insufficient jeton balance',
        code: 'INSUFFICIENT_BALANCE',
        required: fortuneType.jetonCost,
        current: user?.jetonBalance || 0
      }, { status: 400 })
    }
    
    // Create request (and deduct jetons for non-staff)
    const txOps: any[] = []
    if (!isStaff) {
      txOps.push(
        atomicDebitJeton(prisma, authUser.id, fortuneType.jetonCost)
      )
    }
    txOps.push(
      prisma.streamFortuneRequest.upsert({
        where: {
          streamId_userId: {
            streamId: params.streamId,
            userId: authUser.id
          }
        },
        update: {
          typeId,
          nickname: nickname || null,
          isHidden: isHidden || false,
          question: question || null,
          jetonAmount: isStaff ? 0 : fortuneType.jetonCost,
          status: 'pending',
          refundedAt: null
        },
        create: {
          streamId: params.streamId,
          userId: authUser.id,
          typeId,
          nickname: nickname || null,
          isHidden: isHidden || false,
          question: question || null,
          jetonAmount: isStaff ? 0 : fortuneType.jetonCost
        }
      })
    )
    const txResult = await prisma.$transaction(txOps)
    const fortuneRequest = txResult[txResult.length - 1]
    
    return NextResponse.json({
      ...(fortuneRequest as any),
      success: true,
      newBalance: isStaff ? (user.jetonBalance ?? 0) : (user.jetonBalance ?? 0) - fortuneType.jetonCost
    }, { status: 200 })
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error creating fortune request:', error)
    const mapped = mapFortuneCreateException(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

// PATCH - Select, complete or refund a fortune request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    const isBroadcaster = stream?.userId === authUser.id
    
    if (!isBroadcaster) {
      return NextResponse.json({ error: 'Only broadcaster can manage fortune requests' }, { status: 403 })
    }
    
    const { requestId, action } = await request.json()
    
    // Get the request
    const fortuneRequest = await prisma.streamFortuneRequest.findUnique({
      where: { id: requestId }
    })
    
    if (!fortuneRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    if (action === 'select') {
      // Mark as selected - broadcaster is viewing this fortune
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { 
          status: 'selected',
          selectedAt: new Date()
        }
      })
      return NextResponse.json({ success: true, action: 'selected' })
    } 
    
    if (action === 'complete') {
      // Mark as completed - broadcaster has finished this fortune
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      })
      return NextResponse.json({ success: true, action: 'completed' })
    }
    
    if (action === 'refund') {
      // Refund the jetons to the user
      if (fortuneRequest.status === 'completed' || fortuneRequest.status === 'refunded') {
        return NextResponse.json({ error: 'Cannot refund completed or already refunded request' }, { status: 400 })
      }
      
      await prisma.$transaction([
        prisma.user.update({
          where: { id: fortuneRequest.userId },
          data: { jetonBalance: { increment: fortuneRequest.jetonAmount } }
        }),
        prisma.streamFortuneRequest.update({
          where: { id: requestId },
          data: { 
            status: 'refunded',
            refundedAt: new Date()
          }
        })
      ])
      
      return NextResponse.json({ success: true, action: 'refunded', amount: fortuneRequest.jetonAmount })
    }
    
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error updating fortune request:', error)
    return NextResponse.json({ error: 'Failed to update fortune request' }, { status: 500 })
  }
}

// DELETE - Refund and cancel a fortune request (for user or when stream ends)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const refundAll = searchParams.get('refundAll') === 'true'
    
    // Refund all pending requests for a stream (when stream ends)
    if (refundAll) {
      if (!authUser) {
        return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      }
      
      // Check if user is the broadcaster
      const stream = await prisma.videoStream.findUnique({
        where: { id: params.streamId }
      })
      
      if (stream?.userId !== authUser.id) {
        return NextResponse.json({ error: 'Only broadcaster can refund all' }, { status: 403 })
      }
      
      // Get all pending requests
      const pendingRequests = await prisma.streamFortuneRequest.findMany({
        where: { 
          streamId: params.streamId,
          status: 'pending'
        }
      })
      
      // Refund each user
      for (const req of pendingRequests) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: req.userId },
            data: { jetonBalance: { increment: req.jetonAmount } }
          }),
          prisma.streamFortuneRequest.update({
            where: { id: req.id },
            data: { 
              status: 'refunded',
              refundedAt: new Date()
            }
          })
        ])
      }
      
      return NextResponse.json({ 
        success: true, 
        refundedCount: pendingRequests.length,
        totalRefunded: pendingRequests.reduce((sum: any, r: any) => sum + r.jetonAmount, 0)
      })
    }
    
    // Refund single user's request (when user leaves)
    const targetUserId = userId || authUser?.id
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    const fortuneRequest = await prisma.streamFortuneRequest.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: targetUserId
        }
      }
    })
    
    if (!fortuneRequest || fortuneRequest.status !== 'pending') {
      return NextResponse.json({ success: true, message: 'No pending request to refund' })
    }
    
    // Refund
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { jetonBalance: { increment: fortuneRequest.jetonAmount } }
      }),
      prisma.streamFortuneRequest.update({
        where: { id: fortuneRequest.id },
        data: { 
          status: 'refunded',
          refundedAt: new Date()
        }
      })
    ])
    
    return NextResponse.json({ 
      success: true, 
      refunded: true,
      amount: fortuneRequest.jetonAmount
    })
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error refunding fortune request:', error)
    return NextResponse.json({ error: 'Failed to refund' }, { status: 500 })
  }
}
