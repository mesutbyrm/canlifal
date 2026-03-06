import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits, sendFortuneSummaryEmail } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

const ZODIAC_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { zodiacSign, language } = body

    if (!zodiacSign || !ZODIAC_SIGNS.includes(zodiacSign)) {
      return NextResponse.json({ error: 'Valid zodiac sign is required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'horoscope')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const today = new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir astrologsun. Bugün ${today} için ${zodiacSign} burcunun günlük yorumunu yap. Aşk, kariyer, sağlık ve genel enerji hakkında bilgi ver. Cevabın 200-300 kelime arasında, ilham verici ve kişiselleştirilmiş olmalı. Tamamen Türkçe cevap ver.`
      : `You are an experienced astrologer. Provide the daily horoscope for ${zodiacSign} for ${today}. Include insights about love, career, health, and general energy. Your response should be 200-300 words, inspiring and personalized. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Give me my daily horoscope for ${zodiacSign}` },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1-mini', messages, stream: true, max_tokens: 500 }),
    })

    if (!response?.ok) throw new Error('LLM API request failed')

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
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'horoscope',
                      inputData: JSON.stringify({ zodiacSign }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  autoShareFortune(session.user.id, fortune.id, 'horoscope', fullResponse, language || 'en')
                    .catch(err => console.error('Auto-share error:', err))
                  // Send fortune summary email (non-blocking)
                  sendFortuneSummaryEmail(session.user.id, 'horoscope', fullResponse, language || 'en')
                    .catch(err => console.error('Fortune email error:', err))
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
    console.error('Horoscope error:', error)
    return NextResponse.json({ error: 'Failed to generate horoscope' }, { status: 500 })
  }
}
