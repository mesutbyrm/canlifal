import { NextRequest, NextResponse } from 'next/server'
import { checkIpFortuneAccess, getClientIp } from '@/lib/fortune-access'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { callLLM } from '@/lib/llm'
import { checkAndDeductCredits } from '@/lib/credit-checker'
import { getFileUrl } from '@/lib/s3'

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

    const { cupImagePath, saucerImagePath, language } = body

    if (!cupImagePath) {
      return NextResponse.json(
        { error: 'Fincan fotoğrafı gereklidir' },
        { status: 400 }
      )
    }

    // Check and deduct credits
    // Check and deduct credits (skip if ad watched or unregistered)
    if (authUser?.id && !adWatched) {
      const creditResult = await checkAndDeductCredits(authUser.id, 'coffee')
      if (!creditResult.success) {
        return NextResponse.json({ error: creditResult.message, reason: 'needs_cfc' }, { status: 403 })
      }
    }

    // Get signed URLs for the images
    const cupImageUrl = await getFileUrl(cupImagePath, false)
    const saucerImageUrl = saucerImagePath ? await getFileUrl(saucerImagePath, false) : null

    // System prompt for coffee fortune with images
    const systemPrompt = `Sen çok deneyimli bir kahve falcısın. Kullanıcının yüklediği fincan${saucerImageUrl ? ' ve tabak' : ''} görsellerini analiz et ve detaylı bir kahve falı yorumu yap. Fincan içindeki şekilleri, sembolleri ve desenleri yorumla. Cevabın 300-400 kelime arasında, mistik, duygusal ve kişiselleştirilmiş olmalı. Gelecekle ilgili kehanetlerde bulun, aşk, kariyer, sağlık ve şans hakkında bilgi ver. Tamamen Türkçe cevap ver.`

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
    const response = await callLLM({ messages, max_tokens: 700 })
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
                  await prisma.fortune.create({
                    data: {
                      userId: authUser.id,
                      fortuneType: 'coffee',
                      inputData: JSON.stringify({ cupImagePath, saucerImagePath, type: 'image' }),
                      aiResponse: fullResponse,
                      language: language || 'en',
                    },
                  })
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
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Coffee image fortune error:', error)
    return NextResponse.json(
      { error: 'Fal yorumu oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}
