import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Access control: IP-based for unregistered, CFC for registered
    const __body_raw = await request.clone().json().catch(() => ({}))
    const adWatched = __body_raw?.adWatched === true
    if (!session?.user?.id) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    const body = await request.json()
    const { name, birthDate, currentMood, recentExperiences, language } = body

    if (!name) {
      return NextResponse.json({ error: 'İsim gereklidir' }, { status: 400 })
    }

    // Check and deduct credits (skip if ad watched or unregistered)
    if (session?.user?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(session.user.id, 'aura')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    const systemPrompt = `Sen deneyimli bir aura okuyucususun. Kullanıcı bilgileri: İsim: ${name}${birthDate ? `, Doğum Tarihi: ${birthDate}` : ''}${currentMood ? `, Mevcut Ruh Hali: ${currentMood}` : ''}${recentExperiences ? `, Son Yaşanan Deneyimler: ${recentExperiences}` : ''}. Kullanıcının aurasını oku ve analiz et. Ana aura rengi, ikincil renkler, aura tabakası, enerji yoğunluğu ve enerji blokajları hakkında bilgi ver. Duygusal, zihinsel ve ruhsal sağlık hakkında içgörüler sun. Enerjiyi dengelemek için öneriler ver. Cevabın 300-400 kelime arasında olmalı. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Auramı oku' },
    ]

    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1-nano', messages, stream: true, max_tokens: 600 }),
    })

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
                      fortuneType: 'aura',
                      inputData: JSON.stringify({ name, birthDate, currentMood, recentExperiences }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(session.user.id, fortune.id, 'aura', fullResponse, language || 'en')
                    
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
    console.error('Aura reading error:', error)
    return NextResponse.json({ error: 'Aura okuması oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
