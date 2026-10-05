import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
})

const JETON_COST = 5

export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const userId = authUser.id
    const { dreamText, jetonSource } = await req.json()
    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length < 10) {
      return NextResponse.json({ error: 'Rüyanızı en az 10 karakter olarak yazın' }, { status: 400 })
    }
    if (dreamText.length > 3000) {
      return NextResponse.json({ error: 'Rüya metni en fazla 3000 karakter olabilir' }, { status: 400 })
    }

    // Check jeton balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true, zodiacSign: true, risingSign: true, name: true, birthDate: true, role: true },
    })
    const dreamPlan = await resolveJetonSpend(userId, JETON_COST, parseJetonSource(jetonSource))
    const isStaff = dreamPlan.skipDeduction
    const dreamAvail = dreamPlan.source === 'fake' ? dreamPlan.fakeBalance : dreamPlan.realBalance
    if (!user || (!isStaff && dreamAvail < JETON_COST)) {
      return NextResponse.json({ error: `Yetersiz jeton. Bu işlem ${JETON_COST} jeton gerektirir.`, jetonRequired: JETON_COST }, { status: 402 })
    }

    // Get user's recent dream diary for personalization
    const recentDiaries = await prisma.dreamDiaryEntry.findMany({
      where: { userId },
      orderBy: { dreamDate: 'desc' },
      take: 5,
      select: { title: true, symbols: true, mood: true, aiAnalysis: true },
    })

    // Get user's recent dream views for context
    const recentViews = await prisma.dreamView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { dream: { select: { title: true, keywords: true } } },
    })

    // Build personalization context
    let personalizationContext = ''
    if (user.zodiacSign) {
      personalizationContext += `\nKullanıcının burcu: ${user.zodiacSign}`
    }
    if (user.risingSign) {
      personalizationContext += `\nYükselen burcu: ${user.risingSign}`
    }
    if (recentDiaries.length > 0) {
      const diaryContext = recentDiaries.map((d: any) => `- ${d.title} (semboller: ${d.symbols.join(', ')}, ruh hali: ${d.mood || 'bilinmiyor'})`).join('\n')
      personalizationContext += `\n\nKullanıcının son rüya günlüğü kayıtları:\n${diaryContext}`
    }
    if (recentViews.length > 0) {
      const viewContext = recentViews.filter((v: any) => v.dream).map((v: any) => `- ${v.dream.title}`).join('\n')
      personalizationContext += `\n\nKullanıcının son baktığı rüya tabirleri:\n${viewContext}`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen deneyimli bir rüya tabircisisin. Kullanıcının anlattığı rüyayı İslami, psikolojik ve geleneksel Türk kültürü perspektiflerinden KİŞİSELLEŞTİRİLMİŞ olarak yorumlayacaksın.

Kurallar:
- Türkçe yaz
- Samimi ve anlaşılır bir dil kullan
- ${user.name ? `Kullanıcıya "${user.name}" olarak hitap et` : 'Samimi hitap et'}
- İslami yorum, psikolojik yorum ve genel değerlendirme bölümleri olsun
- ${user.zodiacSign ? `Kullanıcının ${user.zodiacSign} burcuna özel yorumlar ekle` : ''}
- ${user.risingSign ? `Yükselen burcu ${user.risingSign} olan kişiler için ek yorum ekle` : ''}
- ${recentDiaries.length > 0 ? 'Kullanıcının geçmiş rüya geçmişini dikkate al ve tekrarlayan temalar varsa belirt' : ''}
- En az 400 kelime yaz
- HTML kullanma, düz metin yaz
- Rüyadaki sembolleri ayrı ayrı ele al
- Olumlu ve umut verici bir ton kullan
- Kişiselleştirilmiş tavsiyeler ver${personalizationContext}`,
        },
        {
          role: 'user',
          content: `Rüyamı yorumla:\n\n${dreamText.trim()}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    })

    const interpretation = completion.choices[0]?.message?.content || 'Yorum oluşturulamadı.'

    // Deduct jetons (staff skip)
    if (!isStaff) {
      await atomicDebitJeton(prisma, userId, JETON_COST, dreamPlan.source)
      try {
        if (dreamPlan.countsAsFinance) await prisma.jetonTransaction.create({
          data: {
            userId,
            amount: -JETON_COST,
            type: 'spend',
            description: 'Kişiselleştirilmiş rüya yorumu',
            balanceBefore: user.jetonBalance,
            balanceAfter: user.jetonBalance - JETON_COST,
          },
        })
      } catch (e) {
        console.error('Jeton transaction log error:', e)
      }
    }

    // Auto-share to social feed
    let socialPostId: string | null = null
    try {
      const dreamSummary = dreamText.trim().length > 150 ? dreamText.trim().substring(0, 150) + '...' : dreamText.trim()
      const interpretSummary = interpretation.length > 300 ? interpretation.substring(0, 300) + '...' : interpretation
      const socialContent = `🌙 Rüya Yorumum\n\n💭 "${dreamSummary}"\n\n🔮 Yorum:\n${interpretSummary}`

      const post = await prisma.socialPost.create({
        data: {
          userId,
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

    return NextResponse.json({
      interpretation,
      socialPostId,
      sharedToSocial: !!socialPostId,
      jetonSpent: isStaff ? 0 : JETON_COST,
      jetonBalance: isStaff ? user.jetonBalance : user.jetonBalance - JETON_COST,
      isPersonalized: !!(user.zodiacSign || recentDiaries.length > 0),
    })
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Dream interpret error:', error)
    return NextResponse.json({ error: 'Rüya yorumlanırken bir hata oluştu' }, { status: 500 })
  }
}
