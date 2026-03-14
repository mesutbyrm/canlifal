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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { description, language } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(session.user.id, 'coffee')
    
    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.message },
        { status: 400 }
      )
    }

    // System prompt for coffee fortune
    const systemPrompt = language === 'tr'
      ? 'Sen deneyimli bir kahve falcısısın. Kullanıcının fincanında gördüklerini mistik ve derinlemesine yorumla. Cevabın 200-300 kelime arasında, duygusal, kişiselleştirilmiş ve gizemli olmalı. Gelecekle ilgili sembolik yorumlar ve tavsiyelerde bulun. Tamamen Türkçe cevap ver.'
      : 'You are an experienced coffee fortune teller. Interpret what the user sees in their coffee cup in a mystical and profound way. Your response should be 200-300 words, emotional, personalized, and mysterious. Provide symbolic interpretations about the future and advice. Respond entirely in English.'

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: description },
    ]

    // Call LLM API with streaming
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        messages,
        stream: true,
        max_tokens: 500,
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
                  const fortune = await prisma.fortune.create({
                    data: {
                      userId: session.user.id,
                      fortuneType: 'coffee',
                      inputData: description,
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
                  // Auto-share to social feed - await to ensure it completes
                  try {
                    await autoShareFortune(session.user.id, fortune.id, 'coffee', fullResponse, language || 'en')
                  } catch (err) {
                    console.error('Auto-share error:', err)
                  }
                  // Send fortune summary email (non-blocking)
                  sendFortuneSummaryEmail(session.user.id, 'coffee', fullResponse, language || 'en')
                    .catch(err => console.error('Fortune email error:', err))
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
      { error: 'Failed to generate fortune' },
      { status: 500 }
    )
  }
}
