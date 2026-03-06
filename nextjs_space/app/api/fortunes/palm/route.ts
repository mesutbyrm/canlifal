import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'
import { getFileUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { palmImagePath, hand, language } = body

    if (!palmImagePath) {
      return NextResponse.json({ error: 'Palm image is required' }, { status: 400 })
    }

    const creditResult = await checkAndDeductCredits(session.user.id, 'palm')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    const palmImageUrl = await getFileUrl(palmImagePath, false)
    const handText = hand === 'left' ? (language === 'tr' ? 'sol el' : 'left hand') : (language === 'tr' ? 'sağ el' : 'right hand')

    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir el falcısısın (palmist). Kullanıcının ${handText} görselini analiz et. Yaşam çizgisi, kalp çizgisi, kader çizgisi, akıl çizgisi ve diğer önemli çizgileri yorumla. Kişilik, aşk hayatı, kariyer, sağlık ve gelecek hakkında detaylı bilgi ver. Cevabın 350-450 kelime arasında, mistik ve aydınlatıcı olmalı. Tamamen Türkçe cevap ver.`
      : `You are an experienced palmist. Analyze the user's ${handText} image. Interpret the life line, heart line, fate line, head line, and other important lines. Provide detailed insights about personality, love life, career, health, and future. Your response should be 350-450 words, mystical and enlightening. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: language === 'tr' ? 'Lütfen elimin fotoğrafını analiz et ve el falımı söyle.' : 'Please analyze my palm photo and tell me my palm reading.' },
          { type: 'image_url', image_url: { url: palmImageUrl } }
        ]
      },
    ]

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-4.1', messages, stream: true, max_tokens: 700 }),
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
                      fortuneType: 'palm',
                      inputData: JSON.stringify({ palmImagePath, hand }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  autoShareFortune(session.user.id, fortune.id, 'palm', fullResponse, language || 'en')
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
    console.error('Palm reading error:', error)
    return NextResponse.json({ error: 'Failed to generate palm reading' }, { status: 500 })
  }
}
