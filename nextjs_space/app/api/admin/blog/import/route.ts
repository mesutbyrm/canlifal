import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

interface BlogRow {
  slug: string
  category: string
  titleTr: string
  titleEn: string
  descTr: string
  descEn: string
  contentTr: string
  contentEn: string
  keywords: string
  isPublished: string
}

function parseCSV(text: string): BlogRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []
  
  // Parse header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())
  
  const rows: BlogRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < headers.length) continue
    
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    
    // Map to BlogRow - support both Turkish and English column names
    rows.push({
      slug: row['slug'] || row['url'] || '',
      category: row['category'] || row['kategori'] || 'genel',
      titleTr: row['titletr'] || row['title_tr'] || row['baslik_tr'] || row['başlık_tr'] || '',
      titleEn: row['titleen'] || row['title_en'] || row['baslik_en'] || row['başlık_en'] || '',
      descTr: row['desctr'] || row['desc_tr'] || row['aciklama_tr'] || row['açıklama_tr'] || '',
      descEn: row['descen'] || row['desc_en'] || row['aciklama_en'] || row['açıklama_en'] || '',
      contentTr: row['contenttr'] || row['content_tr'] || row['icerik_tr'] || row['içerik_tr'] || '',
      contentEn: row['contenten'] || row['content_en'] || row['icerik_en'] || row['içerik_en'] || '',
      keywords: row['keywords'] || row['anahtar_kelimeler'] || '',
      isPublished: row['ispublished'] || row['is_published'] || row['yayinla'] || row['yayınla'] || 'false',
    })
  }
  
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else if (char === ';' && !inQuotes) {
      // Also support semicolon as delimiter (common in Excel exports)
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userRole = ((session.user as any).role || '').toLowerCase()
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }
    
    const text = await file.text()
    const rows = parseCSV(text)
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Geçerli veri bulunamadı' }, { status: 400 })
    }
    
    // Get existing categories
    const existingCategories = await prisma.blogCategory.findMany()
    const categorySet = new Set(existingCategories.map(c => c.slug))
    
    // Track new categories to create
    const newCategories: { slug: string; nameTr: string; nameEn: string }[] = []
    
    const results = {
      success: 0,
      errors: [] as string[],
      newCategories: [] as string[],
    }
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because header is line 1, data starts at line 2
      
      // Validate required fields
      if (!row.slug) {
        results.errors.push(`Satır ${rowNum}: Slug zorunlu`)
        continue
      }
      if (!row.titleTr) {
        results.errors.push(`Satır ${rowNum}: Türkçe başlık zorunlu`)
        continue
      }
      
      // Check if category exists, create if not
      const catSlug = row.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'genel'
      if (!categorySet.has(catSlug)) {
        const catName = row.category || 'Genel'
        newCategories.push({ slug: catSlug, nameTr: catName, nameEn: catName })
        categorySet.add(catSlug)
        results.newCategories.push(catName)
      }
      
      // Parse keywords
      const keywords = row.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
      
      // Parse isPublished
      const isPublished = ['true', '1', 'yes', 'evet', 'yayınla', 'yayinla'].includes(row.isPublished.toLowerCase())
      
      try {
        // Check if slug already exists
        const existing = await prisma.blogPost.findUnique({ where: { slug: row.slug } })
        
        // Check for duplicate title (different slug but same title)
        if (!existing) {
          const existingByTitle = await prisma.blogPost.findFirst({
            where: { titleTr: { equals: row.titleTr, mode: 'insensitive' } },
          })
          if (existingByTitle) {
            results.errors.push(`Satır ${rowNum}: "${row.titleTr}" başlığında yazı zaten mevcut`)
            continue
          }
        }

        if (existing) {
          // Update existing
          await prisma.blogPost.update({
            where: { slug: row.slug },
            data: {
              titleTr: row.titleTr,
              titleEn: row.titleEn || row.titleTr,
              descTr: row.descTr,
              descEn: row.descEn || row.descTr,
              contentTr: row.contentTr,
              contentEn: row.contentEn || row.contentTr,
              category: catSlug,
              keywords,
              isPublished,
            },
          })
        } else {
          // Create new
          await prisma.blogPost.create({
            data: {
              slug: row.slug,
              titleTr: row.titleTr,
              titleEn: row.titleEn || row.titleTr,
              descTr: row.descTr,
              descEn: row.descEn || row.descTr,
              contentTr: row.contentTr,
              contentEn: row.contentEn || row.contentTr,
              category: catSlug,
              keywords,
              isPublished,
            },
          })
        }
        
        results.success++
      } catch (err) {
        console.error(`Row ${rowNum} error:`, err)
        results.errors.push(`Satır ${rowNum}: Kaydetme hatası`)
      }
    }
    
    // Create new categories
    for (const cat of newCategories) {
      try {
        await prisma.blogCategory.upsert({
          where: { slug: cat.slug },
          create: { slug: cat.slug, nameTr: cat.nameTr, nameEn: cat.nameEn, sortOrder: 99 },
          update: {},
        })
      } catch (err) {
        console.error('Category create error:', err)
      }
    }
    
    return NextResponse.json({
      message: `${results.success} yazı başarıyla içe aktarıldı`,
      success: results.success,
      errors: results.errors,
      newCategories: results.newCategories,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'İçe aktarma hatası' }, { status: 500 })
  }
}
