import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import OpenAI from 'openai'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const { dreamText } = await req.json()
    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length < 10) {
      return NextResponse.json({ error: 'Rüyanızı en az 10 karakter olarak yazın' }, { status: 400 })
    }
    if (dreamText.length > 3000) {
      return NextResponse.json({ error: 'Rüya metni en fazla 3000 karakter olabilir' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen deneyimli bir rüya tabircisisin. Kullanıcının anlattığı rüyayı İslami, psikolojik ve geleneksel Türk kültürü perspektiflerinden yorumlayacaksın.

Kurallar:
- Türkçe yaz
- Samimi ve anlaşılır bir dil kullan
- İslami yorum, psikolojik yorum ve genel değerlendirme bölümleri olsun
- En az 300 kelime yaz
- HTML kullanma, düz metin yaz
- Rüyadaki sembolleri ayrı ayrı ele al
- Olumlu ve umut verici bir ton kullan`,
        },
        {
          role: 'user',
          content: `Rüyamı yorumla:\n\n${dreamText.trim()}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const interpretation = completion.choices[0]?.message?.content || 'Yorum oluşturulamadı.'

    // Auto-share to social feed
    let socialPostId: string | null = null
    try {
      const dreamSummary = dreamText.trim().length > 150 ? dreamText.trim().substring(0, 150) + '...' : dreamText.trim()
      const interpretSummary = interpretation.length > 300 ? interpretation.substring(0, 300) + '...' : interpretation
      const socialContent = `🌙 Rüya Yorumum\n\n💭 "${dreamSummary}"\n\n🔮 Yorum:\n${interpretSummary}`

      const post = await prisma.socialPost.create({
        data: {
          userId: session.user.id,
          content: socialContent,
          postType: 'text',
          fortuneType: 'dream',
          isPublic: true,
          isAuto: true,
        },
      })
      socialPostId = post.id
    } catch (shareErr) {
      console.error('Auto-share to social error:', shareErr)
    }

    return NextResponse.json({ interpretation, socialPostId, sharedToSocial: !!socialPostId })
  } catch (error) {
    console.error('Dream interpret error:', error)
    return NextResponse.json({ error: 'Rüya yorumlanırken bir hata oluştu' }, { status: 500 })
  }
}
