import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { callLLM } from '@/lib/llm'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Parse body once
    const body = await request.json().catch(() => ({}))
    const adWatched = body?.adWatched === true

    // Access control: IP-based for unregistered, CFC for registered
    if (!session?.user?.id) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    const { birthDate, birthTime, birthPlace, language } = body

    if (!birthDate || !birthPlace) {
      return NextResponse.json({ error: 'Doğum tarihi ve yeri gereklidir' }, { status: 400 })
    }

    // Check and deduct credits (skip if ad watched or unregistered)
    if (session?.user?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(session.user.id, 'birthchart')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    const systemPrompt = `Sen deneyimli bir astrologsun ve doğum haritası analizi yapıyorsun. Kullanıcının bilgileri: Doğum Tarihi: ${birthDate}, Doğum Saati: ${birthTime || 'bilinmiyor'}, Doğum Yeri: ${birthPlace}. Detaylı bir doğum haritası analizi yap. Güneş burcu, Yükselen burç, Ay burcu, gezegen pozisyonları ve evler hakkında bilgi ver. Kişilik özellikleri, güçlü yönler, zorluklar, kariyer eğilimleri, ilişki dinamiği ve yaşam amacı hakkında detaylı yorum yap. Cevabın 450-550 kelime arasında olmalı. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Doğum haritamı analiz et' },
    ]

    const response = await callLLM({ messages, max_tokens: 800 })

    if (!response?.ok) throw new Error('Yapay zeka servisi yanıt vermedi')

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response?.body?.getReader()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let fullResponse = ''

        try {
          while (true) {
            const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n').filter(line => line.trim() !== '')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  if (session?.user?.id) {
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'birthchart',
                      inputData: JSON.stringify({ birthDate, birthTime, birthPlace }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(session.user.id, fortune.id, 'birthchart', fullResponse, language || 'en')
                    
                  } else {
                    // Auto-share guest fortune to social feed
                    await autoShareFortune(null, null, 'birthchart', fullResponse, language || 'en')
                  }

                  continue
                }
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed?.choices?.[0]?.delta?.content || ''
                  if (content) fullResponse += content
                } catch (e) {}
              }
            }
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (error) {
    console.error('Birth chart error:', error)
    return NextResponse.json({ error: 'Doğum haritası oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
