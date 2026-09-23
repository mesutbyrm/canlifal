import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan(((session.user as any).role || '').toLowerCase(), (session.user as any).id, 'content.announcement.manage', ['admin']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { topics, category, autoPublish, zodiacSign } = await req.json()
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: 'En az 1 konu girin' }, { status: 400 })
    }
    if (topics.length > 5) {
      return NextResponse.json({ error: 'Tek seferde en fazla 5 konu' }, { status: 400 })
    }

    const existingCategories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    const categoryList = existingCategories.map((c: any) => `${c.slug} (${c.nameTr})`).join(', ')

    const results: { title: string; slug: string; success: boolean; error?: string }[] = []

    for (const topic of topics) {
      try {
        const prompt = `Sen Canlifal.com için uzman SEO blog yazarısın. Aşağıdaki konuda 800-1500 kelimelik, SEO uyumlu blog yazısı üret.

Konu: "${topic.trim()}"
Kategori: ${category || 'en uygun olanı seç'}
Mevcut kategoriler: ${categoryList}
${zodiacSign ? `Burç: ${zodiacSign} - yazıyı bu burç özelinde yaz` : ''}

JSON formatında yanıt ver:
{
  "slug": "seo-url-slug",
  "category": "kategori-slug",
  "titleTr": "Türkçe Başlık",
  "titleEn": "English Title",
  "descTr": "Türkçe açıklama 2-3 cümle",
  "descEn": "English desc",
  "metaDescriptionTr": "140-160 karakter meta açıklama",
  "contentTr": "HTML içerik h2/h3 yapısında, FAQ bölümü dahil",
  "contentEn": "HTML content",
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"]
}

Sadece geçerli JSON döndür.`

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

        // Check for duplicate title
        const existingByTitle = await prisma.blogPost.findFirst({
          where: { titleTr: { equals: gen.titleTr || topic, mode: 'insensitive' } },
        })
        if (existingByTitle) {
          results.push({ title: gen.titleTr || topic, slug: '', success: false, error: 'Bu başlıkta yazı zaten mevcut' })
          continue
        }

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
    return NextResponse.json({ error: 'Toplu üretim hatası' }, { status: 500 })
  }
}
