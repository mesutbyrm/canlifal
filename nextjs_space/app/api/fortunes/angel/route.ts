import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Access control: IP-based for unregistered, CFC for registered
    const __body_raw = await request.clone().json().catch(() => ({}))
    const adWatched = __body_raw?.adWatched === true
    if (!session?.user?.id) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    const body = await request.json()
    const { question, cardCount, language } = body

    const count = cardCount || 3

    // Check and deduct credits (skip if ad watched or unregistered)
    if (session?.user?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(session.user.id, 'angel')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    const systemPrompt = `Sen deneyimli bir melek kartı okuyucususun. ${count} melek kartı çek ve her kartın meleksel mesajını açıkla. ${question ? `Kullanıcının sorusu: "${question}".` : ''} Her kart için meleğin ismini, kartın anlamını ve mesajını belirt. Kartların kombinasyonundan genel bir meleksel rehberlik sun. Cevabın 300-400 kelime arasında, şefkatli ve aydınlatıcı olmalı. Tamamen Türkçe cevap ver.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question || ('Melek kartlarımdan rehberlik al') },
    ]

    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
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
                  if (session?.user?.id) {
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'angel',
                      inputData: JSON.stringify({ question, cardCount: count }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  await autoShareFortune(session.user.id, fortune.id, 'angel', fullResponse, language || 'en')
                    
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
    console.error('Angel cards error:', error)
    return NextResponse.json({ error: 'Failed to generate angel card reading' }, { status: 500 })
  }
}
