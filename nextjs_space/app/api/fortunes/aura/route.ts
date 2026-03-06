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
    const { name, birthDate, currentMood, recentExperiences, language } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'aura')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir aura okuyucususun. Kullanıcı bilgileri: İsim: ${name}${birthDate ? `, Doğum Tarihi: ${birthDate}` : ''}${currentMood ? `, Mevcut Ruh Hali: ${currentMood}` : ''}${recentExperiences ? `, Son Yaşanan Deneyimler: ${recentExperiences}` : ''}. Kullanıcının aurasını oku ve analiz et. Ana aura rengi, ikincil renkler, aura tabakası, enerji yoğunluğu ve enerji blokajları hakkında bilgi ver. Duygusal, zihinsel ve ruhsal sağlık hakkında içgörüler sun. Enerjiyi dengelemek için öneriler ver. Cevabın 300-400 kelime arasında olmalı. Tamamen Türkçe cevap ver.`
      : `You are an experienced aura reader. User information: Name: ${name}${birthDate ? `, Birth Date: ${birthDate}` : ''}${currentMood ? `, Current Mood: ${currentMood}` : ''}${recentExperiences ? `, Recent Experiences: ${recentExperiences}` : ''}. Read and analyze the user's aura. Provide information about main aura color, secondary colors, aura layer, energy density, and energy blockages. Offer insights about emotional, mental, and spiritual health. Give recommendations to balance energy. Your response should be 300-400 words. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: language === 'tr' ? 'Auramı oku' : 'Read my aura' },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1-mini', messages, stream: true, max_tokens: 600 }),
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
                      fortuneType: 'aura',
                      inputData: JSON.stringify({ name, birthDate, currentMood, recentExperiences }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  autoShareFortune(session.user.id, fortune.id, 'aura', fullResponse, language || 'en')
                    .catch(err => console.error('Auto-share error:', err))
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
    return NextResponse.json({ error: 'Failed to generate aura reading' }, { status: 500 })
  }
}
