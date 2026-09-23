import { NextRequest, NextResponse } from 'next/server'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { callLLM } from '@/lib/llm'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    
    // Parse body once
    const body = await request.json().catch(() => ({}))
    const adWatched = body?.adWatched === true

    // Access control: IP-based for unregistered, CFC for registered
    if (!authUser) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    const { question, language } = body

    if (!question) {
      return NextResponse.json({ error: 'Lütfen bir soru yazın' }, { status: 400 })
    }

    // Check and deduct credits (skip if ad watched or unregistered)
    if (authUser?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(authUser.id, 'katina')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    const systemPrompt = `Sen deneyimli bir Katina falcısın. Kullanıcının sorusu: "${question}". 32 Katina kartından rastgele 5 kart seç ve her kartın anlamını açıkla. Kartların kombinasyonunu yorumla ve kullanıcının sorusuna mistik bir cevap ver. Cevabın 300-400 kelime arasında, gizemli ve aydınlatıcı olmalı. Her kart için ismini ve anlamını belirt. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    const response = await callLLM({ messages, max_tokens: 600 })

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
                  if (authUser?.id) {
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: authUser.id,
                      fortuneType: 'katina',
                      inputData: question,
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(authUser.id, fortune.id, 'katina', fullResponse, language || 'en')
                    
                  } else {
                    // Auto-share guest fortune to social feed
                    await autoShareFortune(null, null, 'katina', fullResponse, language || 'en')
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
    console.error('Katina error:', error)
    return NextResponse.json({ error: 'Katina falı oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
