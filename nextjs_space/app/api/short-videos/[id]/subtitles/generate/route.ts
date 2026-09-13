export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { callLLM } from '@/lib/llm'
import { guardRateLimit } from '@/lib/rate-limit-guard'

/**
 * POST /api/short-videos/:id/subtitles/generate
 * Auth: ZORUNLU (yalnız video sahibi)
 *
 * NOT: Platformda ses çözümleme (ASR) servisi yoktur. Bu uç, videonun
 * açıklaması ve hashtag'lerinden SRT biçiminde "altyazı önerisi" üretir;
 * kullanıcı düzenleyip kullanır. Yanıtta source='description' döner.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const rateLimited = await guardRateLimit(req, 'ai_generate', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { id } = await params
    const video = await prisma.shortVideo.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        description: true,
        durationSec: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
      },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }
    if (video.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu videoyu düzenleme yetkiniz yok' } },
        { status: 403 }
      )
    }

    const tags = (video.hashtags || []).map((h: any) => h.hashtag?.name).filter(Boolean)
    const context = [video.description || '', tags.map((t: string) => `#${t}`).join(' ')]
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_CONTEXT',
            message: 'Altyazı üretmek için videoya açıklama veya hashtag ekleyin',
          },
        },
        { status: 400 }
      )
    }

    const durationSec = Math.min(Math.max(Math.round(video.durationSec || 15), 5), 90)

    const response = await callLLM({
      model: 'gpt-4.1-nano',
      stream: false,
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'Sen kısa video altyazısı yazan bir editörsün. Yalnız geçerli SRT biçiminde çıktı ver. ' +
            'Kod blokları, açıklama veya başlık ekleme. Metin Türkçe olmalı, her satır en fazla 40 karakter.',
        },
        {
          role: 'user',
          content:
            `Toplam süre ${durationSec} saniye. Aşağıdaki video açıklamasına dayanarak ` +
            `${Math.max(3, Math.min(8, Math.round(durationSec / 4)))} bloktan oluşan SRT altyazı önerisi yaz:\n\n${context}`,
        },
      ],
    })

    const json: any = await response.json()
    const raw: string = json?.choices?.[0]?.message?.content ?? ''
    const srt = raw.replace(/```[a-z]*\n?/gi, '').trim()

    if (!srt) {
      return NextResponse.json(
        { success: false, error: { code: 'GENERATION_FAILED', message: 'Altyazı üretilemedi' } },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: video.id,
        subtitles: srt,
        srt,
        format: 'srt',
        source: 'description',
      },
    })
  } catch (error: any) {
    console.error('[short-videos] subtitles/generate error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Altyazı üretilemedi' } },
      { status: 500 }
    )
  }
}
