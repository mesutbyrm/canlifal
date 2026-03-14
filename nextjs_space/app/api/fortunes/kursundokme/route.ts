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

    let shapes: string
    let language: string
    
    try {
      const body = await request.json()
      shapes = body.shapes || ''
      language = body.language || 'tr'
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(session.user.id, 'kursundokme')
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.message },
        { status: 402 }
      )
    }

    // Generate mystical shape descriptions if none provided
    const shapeTypes = ['kuş', 'kalp', 'göz', 'hilal', 'yıldız', 'el', 'yılan', 'ağaç', 'balık', 'halka']
    const finalShapes = shapes && shapes.trim().length > 0 
      ? shapes 
      : shapeTypes.sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3)).join(', ')

    const systemPrompt = language === 'tr' ? `Sen deneyimli bir kurşun dökme falcısısın. Geleneksel Türk kurşun dökme ritüelini çok iyi biliyorsun.

Kurşun dökme falı, erimiş kurşunun soğuk suya dökülerek oluşan şekillerin yorumlanmasıyla yapılır. Bu şekiller kişinin geleceği, kaderi ve hayatındaki önemli olaylar hakkında mesajlar taşır.

Oluşan şekillere göre detaylı ve mistik bir yorum yap:
- Her şeklin anlamını açıkla
- Şekillerin birbirleriyle ilişkisini yorumla
- Kişinin aşk, iş, sağlık ve para konularında ne gibi gelişmeler yaşayacağını anlat
- Dikkat etmesi gereken uyarıları ver
- Pozitif ve umut dolu bir kapanış yap

Türkçe olarak cevap ver. Mistik ve şiirsel bir dil kullan.` 
    : `You are an experienced lead pouring fortune teller. You deeply understand the traditional Turkish lead pouring ritual.

Lead pouring fortune telling is done by interpreting the shapes formed when molten lead is poured into cold water. These shapes carry messages about a person's future, destiny, and important events in their life.

Provide a detailed and mystical interpretation based on the shapes formed:
- Explain the meaning of each shape
- Interpret the relationship between shapes
- Describe what developments the person will experience in love, work, health, and money
- Give warnings they should pay attention to
- End with a positive and hopeful closing

Respond in English. Use mystical and poetic language.`

    const userPrompt = language === 'tr'
      ? `Kurşun döküldü ve şu şekiller oluştu: ${finalShapes}. Bu şekillerin anlamını yorumla ve falımı söyle.`
      : `The lead was poured and these shapes formed: ${finalShapes}. Interpret the meaning of these shapes and tell my fortune.`

    // Call LLM API
    const llmResponse = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.8,
        stream: true,
      }),
    })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error('LLM API error:', errorText)
      return NextResponse.json(
        { error: language === 'tr' ? 'Fal yorumu alınamadı. Lütfen tekrar deneyin.' : 'Failed to get fortune interpretation. Please try again.' },
        { status: 500 }
      )
    }

    // Stream the response
    const reader = llmResponse.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { error: language === 'tr' ? 'Yanıt alınamadı' : 'No response received' },
        { status: 500 }
      )
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const json = JSON.parse(data)
                  const content = json.choices?.[0]?.delta?.content
                  if (content) {
                    fullResponse += content
                    controller.enqueue(encoder.encode(content))
                  }
                } catch (e) {
                  // Skip parse errors
                }
              }
            }
          }

          // Save fortune to database if we got a response
          if (fullResponse.length > 0) {
            const fortune = await prisma.fortune.create({
              data: {
                userId: session.user.id,
                fortuneType: 'kursundokme',
                inputData: JSON.stringify({ shapes: finalShapes }),
                aiResponse: fullResponse,
                language: language || 'tr',
              },
            })

            // Auto-share to social feed
            await autoShareFortune(session.user.id, fortune.id, 'kursundokme', fullResponse, language || 'tr')
              

            // Send summary email
            sendFortuneSummaryEmail(
              session.user.id,
              'kursundokme',
              fullResponse.substring(0, 500),
              language || 'tr'
            ).catch(err => console.error('Email error:', err))
          }

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Kursun dokme fortune error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
