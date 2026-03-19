import { NextRequest, NextResponse } from 'next/server'
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
    const { query } = await req.json()
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Geçerli bir rüya terimi girin' }, { status: 400 })
    }

    const searchTerm = query.trim()
    const slug = slugifyTurkish(searchTerm)

    // Check if already exists by slug
    const existing = await prisma.dreamInterpretation.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ dream: existing, generated: false })
    }

    // Check if already exists by title (case-insensitive)
    const existingByTitle = await prisma.dreamInterpretation.findFirst({
      where: { title: { contains: searchTerm, mode: 'insensitive' } },
    })
    if (existingByTitle) {
      return NextResponse.json({ dream: existingByTitle, generated: false })
    }

    // Generate with AI
    const systemPrompt = `Sen Türkiye'nin en deneyimli rüya tabircisisin. Rüya yorumlarını İslami, psikolojik ve geleneksel Türk kültürü perspektiflerinden kapsamlı şekilde yaparsın.

Aşağıdaki formatta yanıt ver (JSON):
{
  "title": "Rüyada ... Görmek",
  "content": "<h2>Rüyada ... Görmek Ne Anlama Gelir?</h2>\n<p>...</p>\n<h2>İslami Rüya Tabiri</h2>\n<p>...</p>\n<h2>Psikolojik Yorum</h2>\n<p>...</p>\n<h2>Detaylı Yorumlar</h2>\n<h3>...</h3>\n<p>...</p>\n<h2>Genel Değerlendirme</h2>\n<p>...</p>",
  "summary": "2-3 cümlelik özet",
  "keywords": ["anahtar", "kelimeler"],
  "category": "kategori",
  "metaDescription": "155 karakterlik SEO açıklaması"
}

Kategori seçenekleri (sadece bunlardan birini yaz): genel, hayvanlar, doga, insanlar, nesneler, duygusal, korkulu, dini, gizemli, yolculuk, yiyecek, saglik, para

Önemli kurallar:
- İçerik en az 800 kelime olmalı
- HTML etiketleri kullan (h2, h3, p, ul, li, strong)
- SEO uyumlu, doğal Türkçe yaz
- Farklı senaryoları ele al (örn: büyük yılan, küçük yılan, renkli yılan vb.)
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
      // Fallback: use raw content
      parsed = {
        title: `Rüyada ${searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1)} Görmek`,
        content: raw,
        summary: `${searchTerm} ile ilgili rüya tabiri ve yorumları.`,
        keywords: [searchTerm.toLowerCase()],
        metaDescription: `Rüyada ${searchTerm} görmek ne anlama gelir? Detaylı rüya tabiri ve yorumları.`,
      }
    }

    const validCategories = ['genel', 'hayvanlar', 'doga', 'insanlar', 'nesneler', 'duygusal', 'korkulu', 'dini', 'gizemli', 'yolculuk', 'yiyecek', 'saglik', 'para']
    const cat = validCategories.includes(parsed.category) ? parsed.category : 'genel'

    const dream = await prisma.dreamInterpretation.create({
      data: {
        title: parsed.title || `Rüyada ${searchTerm} Görmek`,
        slug,
        content: parsed.content || raw,
        summary: parsed.summary || '',
        keywords: parsed.keywords || [searchTerm.toLowerCase()],
        category: cat,
        metaDescription: parsed.metaDescription || `Rüyada ${searchTerm} görmek ne anlama gelir?`,
        isPublished: true,
        isAiGenerated: true,
      },
    })

    // Send OneSignal push notification to all subscribers
    const baseUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    sendNotification({
      title: '\u{1F319} Yeni Rüya Tabiri',
      message: dream.title,
      url: `${baseUrl}/tr/ruya/${dream.slug}`,
      targetType: 'all',
    }).catch((err) => console.error('OneSignal dream notification error:', err))

    return NextResponse.json({ dream, generated: true })
  } catch (error) {
    console.error('Dream generate error:', error)
    return NextResponse.json({ error: 'Rüya yorumu oluşturulurken bir hata oluştu' }, { status: 500 })
  }
}
