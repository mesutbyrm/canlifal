import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { checkAndDeductCredits, sendFortuneSummaryEmail } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Parse body once
    const body = await request.json().catch(() => ({}))
    const { question, cardCount, language } = body
    const adWatched = body?.adWatched === true

    // Access control: IP-based for unregistered, CFC for registered
    if (!session?.user?.id) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    if (!question || !cardCount) {
      return NextResponse.json(
        { error: 'Soru ve kart sayısı gereklidir' },
        { status: 400 }
      )
    }

    // Check and deduct credits (skip if ad watched or unregistered)
    if (session?.user?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(session.user.id, 'tarot')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    // System prompt for tarot reading
    const systemPrompt = `Sen deneyimli bir tarot okuyucususun. ${cardCount} kartlık bir tarot okuması yap. Her kartın anlamını açıkla ve kullanıcının sorusuyla ilişkilendir. Cevabın 250-350 kelime arasında, derin, sembolik ve rehberlik edici olmalı. Gerçek tarot kartlarının isimlerini ve anlamlarını kullan. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    // Call LLM API with streaming
    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages,
        stream: true,
        max_tokens: 600,
      }),
    })

    if (!response?.ok) {
      throw new Error('Yapay zeka servisi yanıt vermedi')
    }

    // Stream the response back to client
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
                  // Save fortune to database (only for registered users)
                  if (session?.user?.id) {
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'tarot',
                      inputData: JSON.stringify({ question, cardCount }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(session.user.id, fortune.id, 'tarot', fullResponse, language || 'en')
                    
                  // Send fortune summary email (non-blocking)
                  sendFortuneSummaryEmail(session.user.id, 'tarot', fullResponse, language || 'en')
                    .catch(err => console.error('Fortune email error:', err))
                  } else {
                    // Auto-share guest fortune to social feed
                    await autoShareFortune(null, null, 'tarot', fullResponse, language || 'en')
                  }
                  continue
                }
                
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed?.choices?.[0]?.delta?.content || ''
                  if (content) {
                    fullResponse += content
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
            
            controller.enqueue(encoder.encode(chunk))
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Tarot fortune error:', error)
    return NextResponse.json(
      { error: 'Fal yorumu oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
