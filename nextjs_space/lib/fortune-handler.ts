import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkIpFortuneAccess, checkRegisteredFortuneAccess, getClientIp } from '@/lib/fortune-access'
import { FortuneType, FORTUNE_COSTS } from '@/lib/credit-checker'
import { autoShareFortune } from '@/lib/social-helper'
import { sendFortuneSummaryEmail } from '@/lib/credit-checker'

interface FortuneHandlerOptions {
  fortuneType: FortuneType
  request: Request
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  inputDataForDb?: string
}

/**
 * Unified fortune handler that supports:
 * - Unregistered users with IP-based free fortune (1/day + 1 with ad)
 * - Registered users with CFC deduction
 * - Registered users with ad watching (bypass CFC)
 */
export async function handleFortuneRequest(options: FortuneHandlerOptions) {
  const { fortuneType, request, systemPrompt, userMessage, maxTokens = 600, inputDataForDb } = options

  try {
    const session = await getServerSession(authOptions)
    const body = await request.clone().json().catch(() => ({}))
    const adWatched = body.adWatched === true

    // Access control
    if (!session?.user?.id) {
      // Unregistered user - IP based
      const ip = getClientIp(request)
      const accessResult = await checkIpFortuneAccess(ip, adWatched)

      if (!accessResult.allowed) {
        return NextResponse.json(
          { error: accessResult.message, reason: accessResult.reason },
          { status: 403 }
        )
      }
    } else {
      // Registered user
      if (!adWatched) {
        // Normal CFC flow
        const accessResult = await checkRegisteredFortuneAccess(session.user.id, fortuneType, false)
        if (!accessResult.allowed) {
          return NextResponse.json(
            { error: accessResult.message, reason: accessResult.reason, newBalance: accessResult.newBalance },
            { status: 403 }
          )
        }
      }
      // If adWatched, skip CFC deduction
    }

    // Call LLM API
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages,
        stream: true,
        max_tokens: maxTokens,
      }),
    })

    if (!response?.ok) {
      throw new Error('LLM API request failed')
    }

    // Stream response
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
            controller.enqueue(encoder.encode(chunk))

            // Collect full text for DB save
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed?.choices?.[0]?.delta?.content || ''
                  if (content) fullResponse += content
                } catch {}
              }
            }
          }

          // Save to DB only for registered users
          if (session?.user?.id && fullResponse) {
            try {
              const savedFortune = await prisma.fortune.create({
                data: {
                  userId: session.user.id,
                  fortuneType,
                  inputData: inputDataForDb || userMessage,
                  aiResponse: fullResponse,
                  language: 'tr',
                },
              })

              // Auto-share and email
              autoShareFortune(session.user.id, savedFortune.id, fortuneType, fullResponse, 'tr').catch(() => {})
              sendFortuneSummaryEmail(session.user.id, fortuneType, fullResponse, 'tr').catch(() => {})
            } catch (dbErr) {
              console.error('Fortune DB save error:', dbErr)
            }
          }

          controller.close()
        } catch (err) {
          console.error('Stream error:', err)
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error(`Fortune ${fortuneType} error:`, error)
    return NextResponse.json(
      { error: 'Fal oluşturulurken bir hata oluştu' },
      { status: 500 }
    )
  }
}
