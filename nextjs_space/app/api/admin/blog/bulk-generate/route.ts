import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'

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

    const { topics, category, autoPublish, zodiacSign } = await req.json()
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: 'En az 1 konu girin' }, { status: 400 })
    }
    if (topics.length > 5) {
      return NextResponse.json({ error: 'Tek seferde en fazla 5 konu' }, { status: 400 })
    }

    const existingCategories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    const categoryList = existingCategories.map(c => `${c.slug} (${c.nameTr})`).join(', ')

    const results: { title: string; slug: string; success: boolean; error?: string }[] = []

    for (const topic of topics) {
      try {
        const prompt = `Sen Canlifal.com i\u00e7in uzman SEO blog yazar\u0131s\u0131n. A\u015fa\u011f\u0131daki konuda 800-1500 kelimelik, SEO uyumlu blog yaz\u0131s\u0131 \u00fcret.

Konu: "${topic.trim()}"
Kategori: ${category || 'en uygun olanı seç'}
Mevcut kategoriler: ${categoryList}
${zodiacSign ? `Bur\u00e7: ${zodiacSign} - yaz\u0131y\u0131 bu bur\u00e7 \u00f6zelinde yaz` : ''}

JSON format\u0131nda yan\u0131t ver:
{
  "slug": "seo-url-slug",
  "category": "kategori-slug",
  "titleTr": "T\u00fcrk\u00e7e Ba\u015fl\u0131k",
  "titleEn": "English Title",
  "descTr": "T\u00fcrk\u00e7e a\u00e7\u0131klama 2-3 c\u00fcmle",
  "descEn": "English desc",
  "metaDescriptionTr": "140-160 karakter meta a\u00e7\u0131klama",
  "contentTr": "HTML i\u00e7erik h2/h3 yap\u0131s\u0131nda, FAQ b\u00f6l\u00fcm\u00fc dahil",
  "contentEn": "HTML content",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"]
}

Sadece ge\u00e7erli JSON d\u00f6nd\u00fcr.`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 6000,
        })

        let raw = (completion.choices[0]?.message?.content || '').trim()
        if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        const gen = JSON.parse(raw)

        const wordCount = (gen.contentTr || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
        const readTime = Math.max(1, Math.ceil(wordCount / 200))

        await prisma.blogPost.create({
          data: {
            slug: gen.slug || topic.toLowerCase().replace(/\s+/g, '-').slice(0, 60),
            titleTr: gen.titleTr || topic,
            titleEn: gen.titleEn || '',
            descTr: gen.descTr || '',
            descEn: gen.descEn || '',
            contentTr: gen.contentTr || '',
            contentEn: gen.contentEn || '',
            category: gen.category || category || 'genel',
            keywords: gen.keywords || [],
            metaDescription: gen.metaDescriptionTr || '',
            readTime,
            isPublished: autoPublish || false,
            isAiGenerated: true,
            zodiacSign: zodiacSign || '',
            authorName: 'Canlifal AI',
            authorId: (session.user as any).id,
            publishedAt: autoPublish ? new Date() : null,
          },
        })

        results.push({ title: gen.titleTr || topic, slug: gen.slug || '', success: true })
      } catch (err: any) {
        results.push({ title: topic, slug: '', success: false, error: err.message })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Bulk generate error:', error)
    return NextResponse.json({ error: 'Toplu \u00fcretim hatas\u0131' }, { status: 500 })
  }
}
