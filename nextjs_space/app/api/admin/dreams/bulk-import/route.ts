import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { slugifyTurkish } from '@/lib/dream-utils'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user && ((session.user as any).role || '').toLowerCase() === 'admin'
}

function generateSlug(title: string): string {
  return slugifyTurkish(title)
}

function extractKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase()
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
  }
  const normalized = text.split('').map(ch => turkishMap[ch] || ch).join('')

  // Common Turkish stop words to filter out
  const stopWords = new Set([
    'bir', 've', 'bu', 'da', 'de', 'ile', 'icin', 'ise', 'gibi',
    'daha', 'en', 'cok', 'her', 'o', 'ya', 'ki', 'ne', 'ama',
    'veya', 'olan', 'olarak', 'var', 'yok', 'mi', 'mu', 'dir',
    'den', 'dan', 'nin', 'nun', 'in', 'un', 'an', 'on', 'at',
    'onu', 'bunu', 'sunu', 'sey', 'kadar', 'sonra', 'once',
  ])

  const words = normalized.match(/[a-z]{3,}/g) || []
  const freq: Record<string, number> = {}
  words.forEach(w => {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1
  })

  // Get top keywords
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)
}

function generateMetaDescription(title: string, content: string): string {
  // Take first 150 chars of content as meta description
  const clean = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  const desc = clean.length > 150 ? clean.substring(0, 147) + '...' : clean
  return `${title} - Rüya Tabiri: ${desc}`
}

function generateSummary(content: string): string {
  const clean = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > 300 ? clean.substring(0, 297) + '...' : clean
}

interface ParsedDream {
  title: string
  content: string
}

function parseTxtContent(text: string): ParsedDream[] {
  const dreams: ParsedDream[] = []
  // Split by double newline or --- separator
  const sections = text.split(/\n---\n|\n\n\n+/).filter(s => s.trim())

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) continue

    // First line is title, rest is content
    let title = lines[0].replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim()
    // Remove leading/trailing quotes or special chars
    title = title.replace(/^["']+|["']+$/g, '').trim()

    const content = lines.slice(1).join('\n').trim()

    if (title && content) {
      dreams.push({ title, content })
    } else if (title && !content) {
      // If only one line, use it as both title and content
      dreams.push({ title, content: title })
    }
  }

  return dreams
}

function parseCsvContent(text: string): ParsedDream[] {
  const dreams: ParsedDream[] = []
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return dreams

  // Parse header to detect columns
  const header = lines[0].toLowerCase().trim()
  const headerCols = parseCSVLine(header)

  let titleIdx = headerCols.findIndex(h => h.includes('title') || h.includes('baslik') || h.includes('başlık') || h === 'ad' || h === 'isim' || h === 'name')
  let contentIdx = headerCols.findIndex(h => h.includes('content') || h.includes('icerik') || h.includes('içerik') || h.includes('anlam') || h.includes('meaning') || h.includes('tabir') || h.includes('yorum'))

  // Fallback: first col = title, second col = content
  if (titleIdx === -1) titleIdx = 0
  if (contentIdx === -1) contentIdx = headerCols.length > 1 ? 1 : 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const title = (cols[titleIdx] || '').trim()
    const content = (cols[contentIdx] || '').trim()
    if (title) {
      dreams.push({ title, content: content || title })
    }
  }

  return dreams
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

async function generateSEOWithAI(dreams: ParsedDream[]): Promise<Array<{
  title: string
  content: string
  keywords: string[]
  metaDescription: string
  summary: string
}>> {
  // Process in batches of 10 for AI enhancement
  const results: Array<{
    title: string
    content: string
    keywords: string[]
    metaDescription: string
    summary: string
  }> = []

  const batchSize = 5
  for (let i = 0; i < dreams.length; i += batchSize) {
    const batch = dreams.slice(i, i + batchSize)

    try {
      const prompt = batch.map((d, idx) => 
        `[${idx + 1}] Başlık: ${d.title}\nİçerik: ${d.content.substring(0, 500)}`
      ).join('\n\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `Sen bir SEO uzmanısın. Rüya tabiri içerikleri için SEO optimizasyonu yapıyorsun.

Her rüya tabiri için şunları üret:
1. SEO uyumlu anahtar kelimeler (5-8 adet, Türkçe)
2. Meta açıklama (150-160 karakter, Google'da görünecek)
3. Özet (200-300 karakter)

JSON formatında yanıt ver:
[{"index": 1, "keywords": ["kelime1", "kelime2"], "metaDescription": "...", "summary": "..."}]`
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 2000,
      })

      const responseText = completion.choices[0]?.message?.content || ''
      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        for (const item of parsed) {
          const idx = (item.index || 1) - 1
          if (batch[idx]) {
            results.push({
              title: batch[idx].title,
              content: batch[idx].content,
              keywords: item.keywords || extractKeywords(batch[idx].title, batch[idx].content),
              metaDescription: item.metaDescription || generateMetaDescription(batch[idx].title, batch[idx].content),
              summary: item.summary || generateSummary(batch[idx].content),
            })
          }
        }
      }

      // Fill in any missing items from this batch
      for (let j = 0; j < batch.length; j++) {
        const alreadyProcessed = results.some(r => r.title === batch[j].title && r.content === batch[j].content)
        if (!alreadyProcessed) {
          results.push({
            title: batch[j].title,
            content: batch[j].content,
            keywords: extractKeywords(batch[j].title, batch[j].content),
            metaDescription: generateMetaDescription(batch[j].title, batch[j].content),
            summary: generateSummary(batch[j].content),
          })
        }
      }
    } catch (aiError) {
      console.error('AI SEO generation error, using fallback:', aiError)
      // Fallback to manual generation
      for (const dream of batch) {
        results.push({
          title: dream.title,
          content: dream.content,
          keywords: extractKeywords(dream.title, dream.content),
          metaDescription: generateMetaDescription(dream.title, dream.content),
          summary: generateSummary(dream.content),
        })
      }
    }
  }

  return results
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const textContent = formData.get('textContent') as string | null
    const fileType = formData.get('fileType') as string | null // 'txt' or 'csv'
    const useAI = formData.get('useAI') === 'true'

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

    // Parse content
    let parsedDreams: ParsedDream[]
    if (detectedType === 'csv') {
      parsedDreams = parseCsvContent(rawContent)
    } else {
      parsedDreams = parseTxtContent(rawContent)
    }

    if (parsedDreams.length === 0) {
      return NextResponse.json({ error: 'Hiç rüya tabiri bulunamadı. Dosya formatını kontrol edin.' }, { status: 400 })
    }

    // Generate SEO data
    let processedDreams: Array<{
      title: string
      content: string
      keywords: string[]
      metaDescription: string
      summary: string
    }>

    if (useAI) {
      processedDreams = await generateSEOWithAI(parsedDreams)
    } else {
      processedDreams = parsedDreams.map(d => ({
        title: d.title,
        content: d.content,
        keywords: extractKeywords(d.title, d.content),
        metaDescription: generateMetaDescription(d.title, d.content),
        summary: generateSummary(d.content),
      }))
    }

    // Insert into database
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const dream of processedDreams) {
      try {
        // SEO-optimized title: "Rüyada [Title] Görmek" format if not already
        let seoTitle = dream.title
        if (!seoTitle.toLowerCase().startsWith('rüyada') && !seoTitle.toLowerCase().startsWith('ruyada')) {
          seoTitle = `Rüyada ${dream.title} Görmek`
        }

        // Check for duplicate title (case-insensitive) — skip if already exists
        const existingByTitle = await prisma.dreamInterpretation.findFirst({
          where: { title: { equals: seoTitle, mode: 'insensitive' } },
        })
        if (existingByTitle) {
          skipped++
          errors.push(`"${seoTitle}" zaten mevcut, atlandı`)
          continue
        }

        const slug = generateSlug(dream.title)

        // Check if slug exists, if so skip (don't append numbers — that causes duplicates)
        const existingBySlug = await prisma.dreamInterpretation.findUnique({ where: { slug } })
        if (existingBySlug) {
          skipped++
          errors.push(`"${seoTitle}" slug zaten mevcut, atlandı`)
          continue
        }

        await prisma.dreamInterpretation.create({
          data: {
            title: seoTitle,
            slug,
            content: dream.content,
            summary: dream.summary,
            keywords: [
              ...dream.keywords,
              'rüya tabiri',
              'rüya yorumu',
              slugifyTurkish(dream.title).replace(/-/g, ' '),
            ],
            metaDescription: dream.metaDescription.substring(0, 160),
            isPublished: true,
            isAiGenerated: useAI,
          },
        })
        imported++
      } catch (err: any) {
        if (err?.code === 'P2002') {
          skipped++
          errors.push(`"${dream.title}" zaten mevcut, atlandı`)
        } else {
          skipped++
          errors.push(`"${dream.title}" eklenemedi: ${err?.message || 'Bilinmeyen hata'}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: processedDreams.length,
      errors: errors.slice(0, 20),
    })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
