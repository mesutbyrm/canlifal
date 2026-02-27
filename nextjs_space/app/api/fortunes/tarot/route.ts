import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { question, cardCount, language } = body

    if (!question || !cardCount) {
      return NextResponse.json(
        { error: 'Question and card count are required' },
        { status: 400 }
      )
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(session.user.id, 'tarot')
    
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.message },
        { status: 400 }
      )
    }

    // System prompt for tarot reading
    const systemPrompt = language === 'tr'
      ? `Sen deneyimli bir tarot okuyucususun. ${cardCount} kartlık bir tarot okuması yap. Her kartın anlamını açıkla ve kullanıcının sorusuyla ilişkilendir. Cevabın 250-350 kelime arasında, derin, sembolik ve rehberlik edici olmalı. Gerçek tarot kartlarının isimlerini ve anlamlarını kullan. Tamamen Türkçe cevap ver.`
      : `You are an experienced tarot reader. Perform a ${cardCount}-card tarot reading. Explain the meaning of each card and relate it to the user's question. Your response should be 250-350 words, profound, symbolic, and guiding. Use real tarot card names and meanings. Respond entirely in English.`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ]

    // Call LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        stream: true,
        max_tokens: 600,
      }),
    })

    if (!response?.ok) {
      throw new Error('LLM API request failed')
    }

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
                  // Save fortune to database
                  await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'tarot',
                      inputData: JSON.stringify({ question, cardCount }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
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
    console.error('Tarot fortune error:', error)
    return NextResponse.json(
      { error: 'Failed to generate fortune' },
      { status: 500 }
    )
  }
}
