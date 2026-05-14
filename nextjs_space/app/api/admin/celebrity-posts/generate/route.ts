import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

const CATEGORY_LABELS: Record<string, string> = {
  oyuncu: 'oyuncu/aktör/aktris',
  sarkici: 'şarkıcı/müzisyen',
  futbolcu: 'futbolcu/sporcu',
  youtuber: 'YouTuber/içerik üretici',
  influencer: 'influencer/sosyal medya fenomeni',
  yonetmen: 'yönetmen/yapımcı',
  diger: 'ünlü kişi',
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!user || !ADMIN_ROLES.includes(user.role || '')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { celebrityId, topic } = body

    if (!celebrityId) {
      return NextResponse.json({ error: 'Ünlü seçimi gerekli' }, { status: 400 })
    }

    // Get celebrity info
    const celebrity = await prisma.celebrity.findUnique({
      where: { id: celebrityId },
      select: { name: true, category: true, bio: true }
    })

    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const categoryLabel = CATEGORY_LABELS[celebrity.category] || celebrity.category
    const topicInfo = topic ? `Konu/anahtar kelime: "${topic}"` : 'Genel güncel haberler'

    const prompt = `Sen bir Türk magazin ve haber editörüsün. Aşağıdaki ünlü kişi hakkında güncel bir haber/bilgi yazısı oluştur.

Ünlü: ${celebrity.name}
Kategori: ${categoryLabel}
Biyografi: ${celebrity.bio || 'Bilgi yok'}
${topicInfo}

Görevin:
1. Bu kişi hakkında güncel ve ilgi çekici bir haber/bilgi yaz
2. Gerçekçi ve bilgilendirici ol
3. Kendi yorumunu ve değerlendirmeni de ekle
4. Başlık dikkat çekici olsun
5. Türkçe yaz, samimi ve akıcı bir dil kullan
6. 150-300 kelime arası olsun

ÖNEMLİ: Yanıtını tam olarak aşağıdaki JSON formatında ver, başka bir şey ekleme:
{
  "title": "Dikkat çekici başlık",
  "content": "Haber içeriği ve senin yorumun",
  "summary": "1-2 cümlelik kısa özet"
}

Sadece ham JSON döndür. Kod bloğu, markdown veya başka formatlama kullanma.`

    const apiKey = process.env.ABACUSAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API anahtarı bulunamadı' }, { status: 500 })
    }

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!llmResponse.ok) {
      console.error('LLM API error:', llmResponse.status, await llmResponse.text())
      return NextResponse.json({ error: 'Yapay zeka servisi yanıt vermedi' }, { status: 502 })
    }

    const llmData = await llmResponse.json()
    const rawContent = llmData.choices?.[0]?.message?.content

    if (!rawContent) {
      return NextResponse.json({ error: 'Yapay zeka boş yanıt döndü' }, { status: 500 })
    }

    let parsed: { title: string; content: string; summary: string }
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      return NextResponse.json({ error: 'Yapay zeka yanıtı ayrıştırılamadı' }, { status: 500 })
    }

    // Build the full post content with title
    const fullContent = `📰 ${parsed.title}\n\n${parsed.content}`

    // Create the celebrity post
    const post = await prisma.celebrityPost.create({
      data: {
        celebrityId,
        platform: 'haber',
        postType: 'photo',
        content: fullContent,
        isPinned: false,
      },
      include: {
        celebrity: { select: { name: true, slug: true, profileImage: true } },
      },
    })

    return NextResponse.json({
      post,
      generated: {
        title: parsed.title,
        content: parsed.content,
        summary: parsed.summary,
      },
    })
  } catch (err) {
    console.error('AI generate celebrity post error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
