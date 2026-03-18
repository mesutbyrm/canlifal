import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'
import { slugifyTurkish } from '@/lib/dream-utils'
import { sendNotification } from '@/lib/onesignal-admin'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title } = await req.json()
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return NextResponse.json({ error: 'Geçerli bir başlık girin' }, { status: 400 })
    }

    const searchTerm = title.trim()
    const slug = slugifyTurkish(searchTerm)

    // Check if already exists
    const existing = await prisma.dreamInterpretation.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Bu rüya yorumu zaten mevcut', existing }, { status: 409 })
    }

    const systemPrompt = `Sen Türkiye'nin en deneyimli rüya tabircisisin. Rüya yorumlarını İslami, psikolojik ve geleneksel Türk kültürü perspektiflerinden kapsamlı şekilde yaparsın.

Aşağıdaki formatta yanıt ver (JSON):
{
  "title": "Rüyada ... Görmek",
  "content": "<h2>...</h2>\n<p>...</p>",
  "summary": "2-3 cümlelik özet",
  "keywords": ["anahtar", "kelimeler"],
  "metaDescription": "155 karakterlik SEO açıklaması"
}

Kurallar:
- İçerik en az 800 kelime olmalı
- HTML etiketleri kullan (h2, h3, p, ul, li, strong)
- SEO uyumlu Türkçe
- Farklı senaryoları ele al
- Geleneksel ve modern yorumları harmanlayarak yaz`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `"${searchTerm}" hakkında kapsamlı bir rüya tabiri yaz.` },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const raw = completion.choices[0]?.message?.content || ''
    let parsed: any
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      parsed = {
        title: `Rüyada ${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} Görmek`,
        content: raw,
        summary: `${searchTerm} ile ilgili rüya tabiri.`,
        keywords: [searchTerm.toLowerCase()],
        metaDescription: `Rüyada ${searchTerm} görmek ne anlama gelir?`,
      }
    }

    const dream = await prisma.dreamInterpretation.create({
      data: {
        title: parsed.title || `Rüyada ${searchTerm} Görmek`,
        slug,
        content: parsed.content || raw,
        summary: parsed.summary || '',
        keywords: parsed.keywords || [searchTerm.toLowerCase()],
        metaDescription: parsed.metaDescription || '',
        isPublished: true,
        isAiGenerated: true,
      },
    })

    // Send OneSignal push notification to all subscribers
    const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    sendNotification({
      title: '\u{1F319} Yeni R\u00fcya Tabiri',
      message: dream.title,
      url: `${baseUrl}/tr/ruya/${dream.slug}`,
      targetType: 'all',
    }).catch((err) => console.error('OneSignal dream notification error:', err))

    return NextResponse.json({ dream })
  } catch (error) {
    console.error('Admin dream generate error:', error)
    return NextResponse.json({ error: 'AI rüya yorumu oluşturulurken hata oluştu' }, { status: 500 })
  }
}
