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

    const { title } = await req.json()
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Geçerli bir başlık girin (en az 3 karakter)' }, { status: 400 })
    }

    // Get existing categories
    const existingCategories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    const categoryList = existingCategories.map(c => `${c.slug} (${c.nameTr})`).join(', ')

    const prompt = `Sen bir fal ve astroloji platformu için profesyonel blog yazarısın. Kullanıcı sana bir başlık verecek, sen tüm blog içeriğini oluşturacaksın.

Mevcut kategoriler: ${categoryList}

Kullanıcının verdiği başlık: "${title.trim()}"

Aşağıdaki JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{
  "slug": "seo-uyumlu-url-slug-turkce-karaktersiz",
  "category": "mevcut-kategori-slug-veya-yeni-kategori-slug",
  "newCategory": null veya {"slug": "yeni-slug", "nameTr": "Türkçe Ad", "nameEn": "English Name"} eğer yeni kategori gerekiyorsa,
  "titleTr": "Türkçe Başlık",
  "titleEn": "English Title",
  "descTr": "Türkçe kısa açıklama (2-3 cümle, SEO uyumlu)",
  "descEn": "English short description (2-3 sentences, SEO friendly)",
  "contentTr": "<h2>Alt Başlık</h2><p>Türkçe paragraf...</p> (HTML formatında, en az 800 kelime, detaylı, bilgilendirici, SEO uyumlu blog yazısı. h2, h3, p, ul, li, strong, em etiketleri kullan)",
  "contentEn": "<h2>Subtitle</h2><p>English paragraph...</p> (HTML format, at least 600 words, detailed, informative, SEO-friendly blog post. Use h2, h3, p, ul, li, strong, em tags)",
  "keywords": ["anahtar1", "anahtar2", "keyword3", "keyword4", "keyword5"]
}

ÖNEMLİ KURALLAR:
- Slug Türkçe karakterler içermesin (ö->o, ü->u, ş->s, ç->c, ı->i, ğ->g)
- İçerik fal, astroloji, spiritüel konularda olmalı
- Eğer mevcut kategorilerden hiçbiri uymuyorsa yeni kategori öner
- HTML içeriği zengin ve iyi yapılandırılmış olsun
- Anahtar kelimelerde hem Türkçe hem İngilizce kelimeler olsun (en az 5 adet)
- Sadece geçerli JSON döndür, markdown code block kullanma`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    })

    const raw = completion.choices[0]?.message?.content || ''
    
    // Parse JSON - handle potential markdown wrapping
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }
    
    let generated: any
    try {
      generated = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('AI JSON parse error:', parseErr, 'Raw:', raw.substring(0, 200))
      return NextResponse.json({ error: 'Yapay zeka yanıtı işlenemedi. Lütfen tekrar deneyin.' }, { status: 500 })
    }

    // If AI suggested a new category, create it
    if (generated.newCategory && generated.newCategory.slug) {
      const existing = await prisma.blogCategory.findUnique({ where: { slug: generated.newCategory.slug } })
      if (!existing) {
        const maxOrder = await prisma.blogCategory.aggregate({ _max: { sortOrder: true } })
        await prisma.blogCategory.create({
          data: {
            slug: generated.newCategory.slug,
            nameTr: generated.newCategory.nameTr || generated.newCategory.slug,
            nameEn: generated.newCategory.nameEn || generated.newCategory.slug,
            sortOrder: (maxOrder._max.sortOrder || 0) + 1,
          },
        })
      }
      generated.category = generated.newCategory.slug
    }

    return NextResponse.json({
      slug: generated.slug || '',
      category: generated.category || 'genel',
      titleTr: generated.titleTr || title.trim(),
      titleEn: generated.titleEn || '',
      descTr: generated.descTr || '',
      descEn: generated.descEn || '',
      contentTr: generated.contentTr || '',
      contentEn: generated.contentEn || '',
      keywords: Array.isArray(generated.keywords) ? generated.keywords : [],
      newCategoryCreated: generated.newCategory?.slug || null,
    })
  } catch (error) {
    console.error('Blog generate error:', error)
    return NextResponse.json({ error: 'İçerik oluşturulamadı' }, { status: 500 })
  }
}
