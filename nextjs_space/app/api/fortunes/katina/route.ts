import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question, language } = body

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'katina')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir Katina falcısısın. Kullanıcının sorusu: "${question}". 32 Katina kartından rastgele 5 kart seç ve her kartın anlamını açıkla. Kartların kombinasyonunu yorumla ve kullanıcının sorusuna mistik bir cevap ver. Cevabın 300-400 kelime arasında, gizemli ve aydınlatıcı olmalı. Her kart için ismini ve anlamını belirt. Tamamen Türkçe cevap ver.`
      : `You are an experienced Katina card reader. User's question: "${question}". Select 5 random cards from the 32 Katina deck and explain each card's meaning. Interpret the combination of cards and provide a mystical answer to the user's question. Your response should be 300-400 words, mysterious and enlightening. Name each card and its meaning. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1-nano', messages, stream: true, max_tokens: 600 }),
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
                      fortuneType: 'katina',
                      inputData: question,
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(session.user.id, fortune.id, 'katina', fullResponse, language || 'en')
                    
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
    return NextResponse.json({ error: 'Failed to generate katina reading' }, { status: 500 })
  }
}
