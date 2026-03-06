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
    const { birthDate, birthTime, birthPlace, language } = body

    if (!birthDate || !birthPlace) {
      return NextResponse.json({ error: 'Birth date and place are required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'birthchart')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir astrologsun ve doğum haritası analizi yapıyorsun. Kullanıcının bilgileri: Doğum Tarihi: ${birthDate}, Doğum Saati: ${birthTime || 'bilinmiyor'}, Doğum Yeri: ${birthPlace}. Detaylı bir doğum haritası analizi yap. Güneş burcu, Yükselen burç, Ay burcu, gezegen pozisyonları ve evler hakkında bilgi ver. Kişilik özellikleri, güçlü yönler, zorluklar, kariyer eğilimleri, ilişki dinamiği ve yaşam amacı hakkında detaylı yorum yap. Cevabın 450-550 kelime arasında olmalı. Tamamen Türkçe cevap ver.`
      : `You are an experienced astrologer performing birth chart analysis. User's information: Birth Date: ${birthDate}, Birth Time: ${birthTime || 'unknown'}, Birth Place: ${birthPlace}. Provide a detailed birth chart analysis. Include information about Sun sign, Rising sign, Moon sign, planetary positions, and houses. Provide detailed interpretations about personality traits, strengths, challenges, career tendencies, relationship dynamics, and life purpose. Your response should be 450-550 words. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: language === 'tr' ? 'Doğum haritamı analiz et' : 'Analyze my birth chart' },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1-mini', messages, stream: true, max_tokens: 800 }),
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
                      fortuneType: 'birthchart',
                      inputData: JSON.stringify({ birthDate, birthTime, birthPlace }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed (non-blocking)
                  autoShareFortune(session.user.id, fortune.id, 'birthchart', fullResponse, language || 'en')
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
    console.error('Birth chart error:', error)
    return NextResponse.json({ error: 'Failed to generate birth chart' }, { status: 500 })
  }
}
