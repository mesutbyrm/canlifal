import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { callLLM } from '@/lib/llm'
import { checkAndDeductCredits, sendFortuneSummaryEmail } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Parse body once
    const body = await request.json().catch(() => ({}))
    const adWatched = body?.adWatched === true
    const shapes: string = body?.shapes || ''
    const language: string = body?.language || 'tr'

    // Access control: IP-based for unregistered, CFC for registered
    if (!session?.user?.id) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    // Check and deduct credits
    // Check and deduct credits (skip if ad watched or unregistered)
    if (session?.user?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(session.user.id, 'kursundokme')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    // Generate mystical shape descriptions if none provided
    const shapeTypes = ['kuş', 'kalp', 'göz', 'hilal', 'yıldız', 'el', 'yılan', 'ağaç', 'balık', 'halka']
    const finalShapes = shapes && shapes.trim().length > 0 
      ? shapes 
      : shapeTypes.sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 3)).join(', ')

    const systemPrompt = `Sen deneyimli bir kurşun dökme falcısısın. Geleneksel Türk kurşun dökme ritüelini çok iyi biliyorsun.

Kurşun dökme falı, erimiş kurşunun soğuk suya dökülerek oluşan şekillerin yorumlanmasıyla yapılır. Bu şekiller kişinin geleceği, kaderi ve hayatındaki önemli olaylar hakkında mesajlar taşır.

Oluşan şekillere göre detaylı ve mistik bir yorum yap:
- Her şeklin anlamını açıkla
- Şekillerin birbirleriyle ilişkisini yorumla
- Kişinin aşk, iş, sağlık ve para konularında ne gibi gelişmeler yaşayacağını anlat
- Dikkat etmesi gereken uyarıları ver
- Pozitif ve umut dolu bir kapanış yap

Türkçe olarak cevap ver. Mistik ve şiirsel bir dil kullan.`

    const userPrompt = `Kurşun döküldü ve şu şekiller oluştu: ${finalShapes}. Bu şekillerin anlamını yorumla ve falımı söyle.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    // Call LLM API
    const llmResponse = await callLLM({ messages, max_tokens: 1500, temperature: 0.8 })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error('LLM API error:', errorText)
      return NextResponse.json(
        { error: 'Fal yorumu alınamadı. Lütfen tekrar deneyin.' },
        { status: 500 }
      )
    }

    // Stream the response
    const reader = llmResponse.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { error: 'Yanıt alınamadı' },
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

          // Save fortune to database if we got a response (only for registered users)
          if (session?.user?.id && fullResponse.length > 0) {
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
          } else {
            // Auto-share guest fortune to social feed
            await autoShareFortune(null, null, 'kursundokme', fullResponse, language || 'tr')
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
      { error: error.message || 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
