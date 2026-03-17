import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { getFileUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cupImagePath, saucerImagePath, language } = body

    if (!cupImagePath) {
      return NextResponse.json(
        { error: 'Cup image is required' },
        { status: 400 }
      )
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(session.user.id, 'coffee')
    
    if (!creditResult.success) {
      return NextResponse.json({ error: creditResult.message }, { status: 400 })
    }

    // Get signed URLs for the images
    const cupImageUrl = await getFileUrl(cupImagePath, false)
    const saucerImageUrl = saucerImagePath ? await getFileUrl(saucerImagePath, false) : null

    // System prompt for coffee fortune with images
    const systemPrompt = `Sen çok deneyimli bir kahve falcısısın. Kullanıcının yüklediği fincan${saucerImageUrl ? ' ve tabak' : ''} görsellerini analiz et ve detaylı bir kahve falı yorumu yap. Fincan içindeki şekilleri, sembolleri ve desenleri yorumla. Cevabın 300-400 kelime arasında, mistik, duygusal ve kişiselleştirilmiş olmalı. Gelecekle ilgili kehanetlerde bulun, aşk, kariyer, sağlık ve şans hakkında bilgi ver. Tamamen Türkçe cevap ver.`

    const imageContents = [
      {
        type: 'image_url',
        image_url: { url: cupImageUrl }
      }
    ]

    if (saucerImageUrl) {
      imageContents.push({
        type: 'image_url',
        image_url: { url: saucerImageUrl }
      })
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: 'Lütfen bu kahve fincanı görsellerini analiz et ve falımı söyle.' },
          ...imageContents
        ]
      },
    ]

    // Call LLM API with vision capability
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
        max_tokens: 700,
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
                      fortuneType: 'coffee',
                      inputData: JSON.stringify({ cupImagePath, saucerImagePath, type: 'image' }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
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
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Coffee image fortune error:', error)
    return NextResponse.json(
      { error: 'Failed to generate fortune' },
      { status: 500 }
    )
  }
}
