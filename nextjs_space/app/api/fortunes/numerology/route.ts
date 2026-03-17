import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits, sendFortuneSummaryEmail } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, birthDate, language } = body

    if (!name || !birthDate) {
      return NextResponse.json({ error: 'Name and birth date are required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'numerology')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const systemPrompt = `Sen deneyimli bir numerologsun. Kullanıcının ismi "${name}" ve doğum tarihi "${birthDate}" bilgilerine göre numerolojik analiz yap. Yaşam yolu sayısı, kader sayısı, kişilik özellikleri ve gelecek hakkında bilgi ver. Cevabın 250-350 kelime arasında, mistik ve aydınlatıcı olmalı. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze my numerology: Name: ${name}, Birth Date: ${birthDate}` },
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
                      fortuneType: 'numerology',
                      inputData: JSON.stringify({ name, birthDate }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  await autoShareFortune(session.user.id, fortune.id, 'numerology', fullResponse, language || 'en')
                    
                  // Send fortune summary email (non-blocking)
                  sendFortuneSummaryEmail(session.user.id, 'numerology', fullResponse, language || 'en')
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
    console.error('Numerology error:', error)
    return NextResponse.json({ error: 'Failed to generate numerology reading' }, { status: 500 })
  }
}
