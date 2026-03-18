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

function calculateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').trim()
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, keywords: inputKeywords, mode } = body

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Geçerli bir başlık veya konu girin (en az 3 karakter)' }, { status: 400 })
    }

    const existingCategories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    const categoryList = existingCategories.map(c => `${c.slug} (${c.nameTr})`).join(', ')

    const keywordsHint = inputKeywords && inputKeywords.length > 0
      ? `\nKullanıcının belirttiği anahtar kelimeler: ${inputKeywords.join(', ')}. Bu kelimeleri içerikte doğal şekilde kullan ve keyword listesine ekle.`
      : ''

    const prompt = `Sen Canlifal.com platformu için uzman SEO blog yazarısın. Fal, astroloji, tarot, spiritüel konularda 800-1500 kelimelik, SEO optimizasyonlu, kapsamlı blog yazıları üretiyorsun.

Mevcut kategoriler: ${categoryList}

Kullanıcının verdiği konu/başlık: "${title.trim()}"${keywordsHint}

## İÇERİK KURALLARI:
1. İçerik 800-1500 kelime arası olmalı (ÇOK ÖNEMLİ)
2. HTML yapısı: İlk olarak bir <h2> ana alt başlık ile başla, ardından <h2> ve <h3> alt başlıklar kullan. <h1> KULLANMA (sayfa başlığı zaten h1 olacak)
3. Her bölümde en az 2-3 paragraf olmalı
4. Okunabilirlik: Kısa paragraflar (3-4 cümle), aktif dil, anlaşılır Türkçe
5. SEO: Anahtar kelimeleri doğal şekilde ilk 100 kelimede ve alt başlıklarda kullan
6. Zengin içerik: <ul>/<li> listeleri, <strong> vurguları, <em> italikler kullan
7. Son bölümde mutlaka bir SSS (Sıkça Sorulan Sorular) / FAQ bölümü ekle (en az 4 soru-cevap)

## FAQ BÖLÜMÜ FORMATI (Google Rich Snippet uyumlu):
FAQ bölümünü şu HTML yapısıyla oluştur:
<h2>Sıkça Sorulan Sorular</h2>
<div class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">Soru metni?</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Cevap metni...</p>
    </div>
  </div>
  <!-- Diğer sorular aynı formatta -->
</div>

## ÇIKTI FORMATI (SADECE JSON, başka hiçbir şey yazma):
{
  "slug": "seo-uyumlu-url-slug-turkce-karaktersiz-kisa",
  "category": "mevcut-kategori-slug",
  "newCategory": null,
  "titleTr": "Dikkat Çekici, SEO Uyumlu Türkçe Başlık (50-60 karakter ideal)",
  "titleEn": "SEO Friendly English Title",
  "descTr": "Türkçe kısa açıklama - 2-3 cümle, ana anahtar kelimeyi içeren, merak uyandıran (120-160 karakter)",
  "descEn": "English short description - 2-3 sentences, SEO friendly (120-160 chars)",
  "metaDescriptionTr": "Google arama sonuçlarında görünecek meta açıklama. Ana anahtar kelimeyi içermeli, harekete geçirici, 140-160 karakter (ÖNEMLİ: tam 140-160 karakter arası olmalı)",
  "metaDescriptionEn": "Meta description for Google search results. 140-160 characters with main keyword.",
  "contentTr": "800-1500 kelime HTML içerik (yukarıdaki kurallara uygun, FAQ bölümü dahil)",
  "contentEn": "600-1200 word HTML content (following rules above, including FAQ section)",
  "keywords": ["ana-anahtar-kelime", "uzun-kuyruk-anahtar1", "uzun-kuyruk-anahtar2", "ingilizce-keyword1", "ingilizce-keyword2", "ilgili-terim1", "ilgili-terim2", "soru-formunda-anahtar"],
  "faqQuestions": ["Soru 1?", "Soru 2?", "Soru 3?", "Soru 4?"]
}

ÖNEMLİ KURALLAR:
- Slug: Türkçe karakter yok (ö->o, ü->u, ş->s, ç->c, ı->i, ğ->g), max 5-6 kelime
- Kategori: Mevcut kategorilerden en uygununu seç. Sadece hiçbiri uymazsa newCategory öner
- Keywords: En az 8 adet, hem TR hem EN, uzun kuyruk (long-tail) dahil, soru formunda olanlar dahil
- İçerik fal, astroloji, spiritüel, burçlar gibi konularda olmalı
- metaDescriptionTr tam 140-160 karakter olmalı
- Sadece geçerli JSON döndür, markdown code block kullanma`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    })

    const raw = completion.choices[0]?.message?.content || ''

    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let generated: any
    try {
      generated = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('AI JSON parse error:', parseErr, 'Raw:', raw.substring(0, 300))
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

    const contentTr = generated.contentTr || ''
    const contentEn = generated.contentEn || ''

    return NextResponse.json({
      slug: generated.slug || '',
      category: generated.category || 'genel',
      titleTr: generated.titleTr || title.trim(),
      titleEn: generated.titleEn || '',
      descTr: generated.descTr || '',
      descEn: generated.descEn || '',
      metaDescriptionTr: generated.metaDescriptionTr || generated.descTr?.slice(0, 160) || '',
      metaDescriptionEn: generated.metaDescriptionEn || generated.descEn?.slice(0, 160) || '',
      contentTr,
      contentEn,
      keywords: Array.isArray(generated.keywords) ? generated.keywords : [],
      faqQuestions: Array.isArray(generated.faqQuestions) ? generated.faqQuestions : [],
      readTime: calculateReadTime(contentTr),
      isAiGenerated: true,
      newCategoryCreated: generated.newCategory?.slug || null,
    })
  } catch (error) {
    console.error('Blog generate error:', error)
    return NextResponse.json({ error: 'İçerik oluşturulamadı' }, { status: 500 })
  }
}