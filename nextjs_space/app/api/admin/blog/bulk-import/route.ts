import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user && ((session.user as any).role || '').toLowerCase() === 'admin'
    ? (session.user as any).id
    : null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

interface ParsedBlog {
  title: string
  content: string
}

function parseTxtContent(text: string): ParsedBlog[] {
  const blogs: ParsedBlog[] = []
  const sections = text.split(/\n---\n|\n\n\n+/).filter(s => s.trim())
  for (const section of sections) {
    const lines = section.trim().split('\n').filter((l: string) => l.trim())
    if (lines.length === 0) continue
    let title = lines[0].replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim()
    title = title.replace(/^["']+|["']+$/g, '').trim()
    const content = lines.slice(1).join('\n').trim()
    if (title && content) blogs.push({ title, content })
    else if (title && !content) blogs.push({ title, content: title })
  }
  return blogs
}

function parseCsvContent(text: string): ParsedBlog[] {
  const blogs: ParsedBlog[] = []
  const lines = text.split('\n').filter((l: string) => l.trim())
  if (lines.length < 2) return blogs
  const header = lines[0].toLowerCase().trim()
  const headerCols = parseCSVLine(header)
  let titleIdx = headerCols.findIndex((h: string) => h.includes('title') || h.includes('baslik') || h.includes('başlık') || h === 'ad' || h === 'isim')
  let contentIdx = headerCols.findIndex((h: string) => h.includes('content') || h.includes('icerik') || h.includes('içerik') || h.includes('metin') || h.includes('yazi'))
  if (titleIdx === -1) titleIdx = 0
  if (contentIdx === -1) contentIdx = headerCols.length > 1 ? 1 : 0
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const title = (cols[titleIdx] || '').trim()
    const content = (cols[contentIdx] || '').trim()
    if (title) blogs.push({ title, content: content || title })
  }
  return blogs
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ } else { inQuotes = !inQuotes }
    } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      result.push(current.trim()); current = ''
    } else { current += ch }
  }
  result.push(current.trim())
  return result
}

async function generateBlogSEOWithAI(blogs: ParsedBlog[]): Promise<Array<{
  title: string
  content: string
  description: string
  keywords: string[]
  metaDescription: string
}>> {
  const results: Array<{
    title: string; content: string; description: string; keywords: string[]; metaDescription: string
  }> = []

  const batchSize = 5
  for (let i = 0; i < blogs.length; i += batchSize) {
    const batch = blogs.slice(i, i + batchSize)
    try {
      const prompt = batch.map((d, idx) =>
        `[${idx + 1}] Başlık: ${d.title}\nİçerik: ${d.content.substring(0, 500)}`
      ).join('\n\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Sen bir SEO uzmanısın. Blog yazıları için SEO optimizasyonu yapıyorsun.
Her blog yazısı için şunları üret:
1. Kısa açıklama (2-3 cümle)
2. SEO uyumlu anahtar kelimeler (5-8 adet, Türkçe)
3. Meta açıklama (150-160 karakter, Google'da görünecek)
JSON formatında yanıt ver:
[{"index": 1, "description": "...", "keywords": ["kelime1"], "metaDescription": "..."}]`
        }, { role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      })

      const responseText = completion.choices[0]?.message?.content || ''
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        for (const item of parsed) {
          const idx = (item.index || 1) - 1
          if (batch[idx]) {
            results.push({
              title: batch[idx].title,
              content: batch[idx].content,
              description: item.description || batch[idx].content.substring(0, 200),
              keywords: item.keywords || [],
              metaDescription: item.metaDescription || batch[idx].content.substring(0, 160),
            })
          }
        }
      }
      // Fill missing
      for (let j = 0; j < batch.length; j++) {
        const alreadyProcessed = results.some(r => r.title === batch[j].title && r.content === batch[j].content)
        if (!alreadyProcessed) {
          results.push({
            title: batch[j].title, content: batch[j].content,
            description: batch[j].content.substring(0, 200),
            keywords: [], metaDescription: batch[j].content.substring(0, 160),
          })
        }
      }
    } catch (aiError) {
      console.error('AI SEO blog generation error, using fallback:', aiError)
      for (const blog of batch) {
        results.push({
          title: blog.title, content: blog.content,
          description: blog.content.substring(0, 200),
          keywords: [], metaDescription: blog.content.substring(0, 160),
        })
      }
    }
  }
  return results
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await isAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const textContent = formData.get('textContent') as string | null
    const fileType = formData.get('fileType') as string | null
    const useAI = formData.get('useAI') === 'true'
    const category = (formData.get('category') as string) || 'genel'

    let rawContent = ''
    let detectedType = fileType || 'txt'

    if (file) {
      rawContent = await file.text()
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.csv')) detectedType = 'csv'
      else if (fileName.endsWith('.txt')) detectedType = 'txt'
    } else if (textContent) {
      rawContent = textContent
    } else {
      return NextResponse.json({ error: 'Dosya veya metin içeriği gerekli' }, { status: 400 })
    }

    if (!rawContent.trim()) {
      return NextResponse.json({ error: 'İçerik boş' }, { status: 400 })
    }

    let parsedBlogs: ParsedBlog[]
    if (detectedType === 'json') {
      try {
        parsedBlogs = JSON.parse(rawContent) as ParsedBlog[]
      } catch {
        return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 })
      }
    } else if (detectedType === 'csv') {
      parsedBlogs = parseCsvContent(rawContent)
    } else {
      parsedBlogs = parseTxtContent(rawContent)
    }

    if (parsedBlogs.length === 0) {
      return NextResponse.json({ error: 'Hiç blog yazısı bulunamadı. Dosya formatını kontrol edin.' }, { status: 400 })
    }

    // Generate SEO data
    let processedBlogs: Array<{
      title: string; content: string; description: string; keywords: string[]; metaDescription: string
    }>

    if (useAI) {
      processedBlogs = await generateBlogSEOWithAI(parsedBlogs)
    } else {
      processedBlogs = parsedBlogs.map(b => ({
        title: b.title, content: b.content,
        description: b.content.replace(/\n+/g, ' ').substring(0, 200),
        keywords: [],
        metaDescription: b.content.replace(/\n+/g, ' ').substring(0, 160),
      }))
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const blog of processedBlogs) {
      try {
        // Check duplicate title
        const existingByTitle = await prisma.blogPost.findFirst({
          where: { titleTr: { equals: blog.title, mode: 'insensitive' } },
        })
        if (existingByTitle) {
          skipped++
          errors.push(`"${blog.title}" zaten mevcut, atlandı`)
          continue
        }

        const slug = slugify(blog.title)
        const existingBySlug = await prisma.blogPost.findUnique({ where: { slug } })
        if (existingBySlug) {
          skipped++
          errors.push(`"${blog.title}" slug zaten mevcut, atlandı`)
          continue
        }

        const wordCount = blog.content.replace(/<[^>]*>/g, '').split(/\s+/).length
        const readTime = Math.max(1, Math.ceil(wordCount / 200))

        await prisma.blogPost.create({
          data: {
            slug,
            titleTr: blog.title,
            titleEn: '',
            descTr: blog.description,
            descEn: '',
            contentTr: blog.content,
            contentEn: '',
            category,
            keywords: blog.keywords,
            metaDescription: blog.metaDescription.substring(0, 160),
            coverImage: '',
            readTime,
            isPublished: true,
            isFeatured: false,
            isTrending: false,
            isEditorPick: false,
            isAiGenerated: useAI,
            isPremium: false,
            zodiacSign: '',
            authorName: 'Canlifal Editör',
            authorId: adminId,
            publishedAt: new Date(),
          },
        })
        imported++
      } catch (err: any) {
        if (err?.code === 'P2002') {
          skipped++
          errors.push(`"${blog.title}" zaten mevcut, atlandı`)
        } else {
          skipped++
          errors.push(`"${blog.title}" eklenemedi: ${err?.message || 'Bilinmeyen hata'}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: processedBlogs.length,
      errors: errors.slice(0, 20),
    })
  } catch (error) {
    console.error('Blog bulk import error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
