import { NextRequest, NextResponse } from 'next/server'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { callLLM } from '@/lib/llm'
import { checkAndDeductCredits, sendFortuneSummaryEmail } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    
    // Parse body once
    const body = await request.json().catch(() => ({}))
    const adWatched = body?.adWatched === true

    // Access control: IP-based for unregistered, CFC for registered
    if (!authUser) {
      const ip = getClientIp(request)
      const ipAccess = await checkIpFortuneAccess(ip, adWatched)
      if (!ipAccess.allowed) {
        return NextResponse.json({ error: ipAccess.message, reason: ipAccess.reason }, { status: 403 })
      }
    }

    const { description, language } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Açıklama gereklidir' },
        { status: 400 }
      )
    }

    // Check and deduct credits (skip if ad watched or unregistered)
    if (authUser?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(authUser.id, 'coffee')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    // System prompt for coffee fortune
    const systemPrompt = 'Sen deneyimli bir kahve falcısın. Kullanıcının fincanında gördüklerini mistik ve derinlemesine yorumla. Cevabın 200-300 kelime arasında, duygusal, kişiselleştirilmiş ve gizemli olmalı. Gelecekle ilgili sembolik yorumlar ve tavsiyelerde bulun. Tamamen Türkçe cevap ver.'

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description },
    ]

    // Call LLM API with streaming
    const response = await callLLM({ messages })
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
                  if (authUser?.id) {
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: authUser.id,
                      fortuneType: 'coffee',
                      inputData: description,
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed - await to ensure it completes
                  try {
                    await autoShareFortune(authUser.id, fortune.id, 'coffee', fullResponse, language || 'en')
                  } catch (err) {
                    console.error('Auto-share error:', err)
                  }
                  // Send fortune summary email (non-blocking)
                  sendFortuneSummaryEmail(authUser.id, 'coffee', fullResponse, language || 'en')
                    .catch(err => console.error('Fortune email error:', err))
                  } else {
                    // Auto-share guest fortune to social feed
                    await autoShareFortune(null, null, 'coffee', fullResponse, language || 'en')
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
    console.error('Coffee fortune error:', error)
    return NextResponse.json(
      { error: 'Fal yorumu oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
