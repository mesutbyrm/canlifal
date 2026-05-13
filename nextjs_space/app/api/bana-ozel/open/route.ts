export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

const TAROT_CARDS = [
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
]

const ZODIAC_SIGNS = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık']

function getPromptForItem(slug: string, userName: string, zodiac: string | null): string {
  const sign = zodiac || ZODIAC_SIGNS[Math.floor(Math.random() * 12)]
  const prompts: Record<string, string> = {
    'gunluk-tarot': `Sen mistik bir tarot falcısın. ${userName} için günlük bir tarot kartı çek ve yorumla. Kart: ${TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]}. Gizemli ve etkileyici bir dilde 3-4 paragraf yaz. Kartın anlamını, günlük etkisini ve tavsiyeni belirt.`,
    'gunluk-burc': `Sen deneyimli bir astrologsun. ${userName} için ${sign} burcu günlük yorumu yaz. Aşk, kariyer, sağlık ve genel enerji hakkında 3-4 paragraf yaz. Bugünün gezegen konumlarından bahset.`,
    'yildizname': `Sen bir yıldızname uzmanısın. ${userName} için yıldızname yorumu yaz. Yıldızların kişiye özel mesajını, kader çizgisini ve geleceğe dair ipuçlarını 3-4 paragraf olarak anlat.`,
    'ask-uyumu': `Sen bir aşk falcısın. ${userName} için detaylı bir aşk uyumu analizi yaz. Mevcut ilişki enerjisini, uyum yüzdesini ve gelecek dönem aşk hayatı hakkında 3-4 paragraf yaz.`,
    'para-kariyer': `Sen bir kariyer ve finans astrologusun. ${userName} için para ve kariyer falı yaz. Maddi fırsatlar, kariyer değişiklikleri ve yatırım enerjisi hakkında 3-4 paragraf yaz.`,
    'sansli-sayilar': `Sen bir numeroloji uzmanısın. ${userName} için bugünün şanslı sayılarını (3 adet) belirle ve her birinin anlamını açıkla. Şanslı renkler ve saatler de ekle. 2-3 paragraf yaz.`,
    'evren-mesaj': `Sen evrenin sözcüsüsün. ${userName} için evrenin bugünkü özel mesajını ilet. Derin, anlamlı ve ilham verici bir mesaj yaz. 2-3 paragraf.`,
    'gunluk-kehanet': `Sen güçlü bir kâhinsın. ${userName} için bugünün kehanetini yaz. Gizemli ve etkileyici bir dilde yakın gelecekte olacak olayları 3-4 paragraf olarak anlat.`,
    '3-kart-tarot': `Sen bir tarot ustasısın. ${userName} için 3 kart tarot açılımı yap. Geçmiş: ${TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]}, Şimdi: ${TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]}, Gelecek: ${TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]}. Her kartı ayrı ayrı yorumla ve genel mesajı ver.`,
    '7-kart-tarot': `Sen bir tarot büyük ustasısın. ${userName} için 7 kart tarot açılımı yap. Kartları sırayla çek ve her birini detaylı yorumla. Genel mesajı en sonda ver. 5-6 paragraf yaz.`,
    'kahve-fali': `Sen deneyimli bir kahve falcısın. ${userName} için fincanında gördüğün şekilleri yorumla. En az 3 sembol gör ve her birini detaylı anlat. Gizemli bir dilde 3-4 paragraf yaz.`,
    'ruya-yorumu': `Sen bir rüya yorumcusun. ${userName} için genel bir rüya analizi yaz. Son dönemin rüya enerjisini, bilinçaltı mesajlarını ve dikkat edilmesi gerekenleri 3-4 paragraf anlat.`,
    'nazar-analizi': `Sen bir nazar uzmanısın. ${userName} için nazar analizi yap. Nazar enerjisini ölç, koruma önerileri sun ve negatif enerjiden arınma yollarını 3-4 paragraf olarak anlat.`,
    'ask-fali': `Sen romantik bir aşk falcısın. ${userName} için aşk falı bak. Kalp enerjisini oku, yakın dönem aşk hayatını ve potansiyel gelişmeleri 3-4 paragraf anlat.`,
    'gelecek-kehaneti': `Sen güçlü bir medyumsun. ${userName} için gelecek kehaneti yaz. Önümüzdeki dönemde karşılaşacağı olaylar, fırsatlar ve dikkat etmesi gerekenler hakkında 4-5 paragraf yaz.`,
    'haftalik-burc': `Sen bir astrologsun. ${userName} için ${sign} burcu haftalık yorumu yaz. Bu haftanın öne çıkan günleri, dikkat edilmesi gerekenler ve fırsatlar hakkında 3-4 paragraf yaz.`,
    'ay-burcu': `Sen bir ay burcu uzmanısın. ${userName} için ay burcu yorumu yaz. Duygusal dünyası, iç sesi ve bilinçaltı hakkında 3-4 paragraf yaz.`,
    'yukselen-burc': `Sen bir astroloji uzmanısın. ${userName} için yükselen burç analizi yaz. Dış dünyaya yansıttığı enerji, ilk izlenim ve sosyal kişiliği hakkında 3-4 paragraf yaz.`,
    'enerji-analizi': `Sen bir enerji okuyucususun. ${userName} için bugünün enerji analizini yaz. Fiziksel, duygusal ve ruhsal enerji seviyelerini ölç ve tavsiyeler ver. 2-3 paragraf yaz.`,
    'spiritüel-rehber': `Sen bir spiritüel rehbersin. ${userName} için ruhani rehberin mesajını ilet. Derin, anlamlı ve kişisel bir mesaj yaz. 2-3 paragraf.`,
    'gizli-mesaj': `Sen evrenin gizemli elçisisin. ${userName} için evrenin gizli mesajını çöz. Semboller ve işaretler üzerinden anlamlı bir yorum yaz. 3-4 paragraf.`,
    'iliski-gelecegi': `Sen bir ilişki uzmanısın. ${userName} için ilişki geleceği analizi yaz. Mevcut ilişki dinamikleri, gelecek dönem ve tavsiyeler hakkında 4-5 paragraf yaz.`,
    'ruh-esi': `Sen bir ruh eşi uzmanısın. ${userName} için ruh eşi analizi yaz. Ruh eşinin özellikleri, karşılaşma zamanı ve enerjisi hakkında 3-4 paragraf yaz.`,
    'gizli-duygular': `Sen bir duygu okuyucususun. ${userName} için gizli duygular falı yaz. Bilinçaltındaki gizli duyguları, bastırılmış hisleri ve farkındalık önerilerini 3-4 paragraf anlat.`,
    'kader-yorumu': `Sen bir kader çizgisi uzmanısın. ${userName} için kader yorumu yaz. Hayat yolculuğu, kader dönüm noktaları ve gelecek planlar hakkında 4-5 paragraf yaz.`,
    'sans-kapisi': `Sen bir şans falcısın. ${userName} için şans kapısı falı bak. Bugün hangi kapının açılacağını, şansın nereden geleceğini ve fırsatları 3-4 paragraf anlat.`,
    'astro-tavsiye': `Sen bir astroloji danışmanısın. ${userName} için günün astrolojik tavsiyesini yaz. Gezegen konumlarına göre yapılması ve kaçınılması gerekenler hakkında 2-3 paragraf yaz.`,
    'astro-enerji': `Sen bir astrolojik enerji uzmanısın. ${userName} için astrolojik enerji yorumu yaz. Gezegenlerin enerjisinin kişiye etkisini 3-4 paragraf anlat.`,
    'karmik-bag': `Sen bir karmik bağ uzmanısın. ${userName} için karmik bağ analizi yaz. Geçmiş yaşam bağlantıları, karmik dersler ve mevcut ilişkilerdeki karmik etkileri 4-5 paragraf anlat.`,
    'evren-uyari': `Sen evrenin uyarı sistemisin. ${userName} için bugünkü evrensel uyarıyı ilet. Dikkat edilmesi gerekenler, kaçınılması gereken durumlar ve koruma tavsiyeleri hakkında 2-3 paragraf yaz.`,
  }
  return prompts[slug] || `Sen bir fal ve astroloji uzmanısın. ${userName} için mistik bir yorum yaz. 3-4 paragraf.`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { slug } = await req.json()
    if (!slug) {
      return NextResponse.json({ error: 'İçerik belirtilmedi' }, { status: 400 })
    }

    // Get item
    const item = await prisma.banaOzelItem.findUnique({ where: { slug } })
    if (!item || !item.isActive) {
      return NextResponse.json({ error: 'İçerik bulunamadı' }, { status: 404 })
    }

    // Check jeton balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true, name: true, zodiacSign: true },
    })
    if (!user || user.jetonBalance < item.jetonCost) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi', required: item.jetonCost, current: user?.jetonBalance ?? 0 }, { status: 402 })
    }

    // Generate content via LLM
    const prompt = getPromptForItem(slug, user.name || 'Sevgili kullanıcı', user.zodiacSign)
    let content = ''
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: 'Sen mistik, gizemli ve etkileyici bir dilde konuşan bir fal ve astroloji uzmanısın. Yanıtlarını Türkçe ver. Emoji kullan ama abartma. Her zaman olumlu ve umut verici ol.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.9,
      })
      content = completion.choices[0]?.message?.content || 'Yıldızlar şu anda sessiz... Lütfen daha sonra tekrar deneyin.'
    } catch (llmError) {
      console.error('LLM error:', llmError)
      content = 'Evrenin enerjisi şu anda yoğun. Lütfen birazdan tekrar deneyin. ✨'
    }

    // Deduct jeton in a transaction
    const newBalance = user.jetonBalance - item.jetonCost
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { jetonBalance: newBalance },
      }),
      prisma.jetonTransaction.create({
        data: {
          userId: session.user.id,
          amount: -item.jetonCost,
          type: 'spend',
          description: item.nameTr,
          itemSlug: slug,
          balanceBefore: user.jetonBalance,
          balanceAfter: newBalance,
        },
      }),
      prisma.banaOzelHistory.create({
        data: {
          userId: session.user.id,
          itemSlug: slug,
          content,
          jetonSpent: item.jetonCost,
        },
      }),
    ])

    // Update streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const existingStreak = await prisma.userFortuneStreak.findUnique({
      where: { userId: session.user.id },
    })

    if (existingStreak) {
      const lastDate = existingStreak.lastFortuneDate ? new Date(existingStreak.lastFortuneDate) : null
      lastDate?.setHours(0, 0, 0, 0)
      let newStreak = existingStreak.currentStreak
      if (!lastDate || lastDate.getTime() < yesterday.getTime()) {
        newStreak = 1
      } else if (lastDate.getTime() === yesterday.getTime()) {
        newStreak = existingStreak.currentStreak + 1
      }
      await prisma.userFortuneStreak.update({
        where: { userId: session.user.id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, existingStreak.longestStreak),
          lastFortuneDate: new Date(),
          totalFortunes: existingStreak.totalFortunes + 1,
        },
      })

      // Streak bonus: every 7 days give 10 bonus credits (bonuses go to credits, not jetons)
      if (newStreak > 0 && newStreak % 7 === 0) {
        const bonusAmount = 10
        await prisma.$transaction([
          prisma.user.update({
            where: { id: session.user.id },
            data: { credits: { increment: bonusAmount } },
          }),
          prisma.creditTransaction.create({
            data: {
              userId: session.user.id,
              amount: bonusAmount,
              type: 'streak_bonus',
              description: `${newStreak} günlük seri bonusu!`,
              balance: 0, // approximate
            },
          }),
        ])
      }
    } else {
      await prisma.userFortuneStreak.create({
        data: {
          userId: session.user.id,
          currentStreak: 1,
          longestStreak: 1,
          lastFortuneDate: new Date(),
          totalFortunes: 1,
        },
      })
    }

    // Complete daily task
    try {
      await prisma.dailyTask.upsert({
        where: { userId_taskType_date: { userId: session.user.id, taskType: 'open_fortune', date: today } },
        update: {},
        create: {
          userId: session.user.id,
          taskType: 'open_fortune',
          jetonEarned: 2,
          date: today,
        },
      })
    } catch { /* already completed */ }

    // Get tarot card info for tarot items
    let tarotCard = null
    if (slug.includes('tarot')) {
      tarotCard = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]
    }

    // Auto-share to social feed (full content, not truncated)
    try {
      await prisma.socialPost.create({
        data: {
          userId: session.user.id,
          content: content,
          postType: 'fortune',
          fortuneType: slug,
          isPublic: true,
          isAuto: true,
        },
      })
    } catch (socialErr) {
      console.error('Auto social share error:', socialErr)
      // Don't fail the main request if social sharing fails
    }

    return NextResponse.json({
      success: true,
      content,
      tarotCard,
      jetonSpent: item.jetonCost,
      newBalance: newBalance,
      item: { nameTr: item.nameTr, nameEn: item.nameEn, icon: item.icon },
    })
  } catch (error) {
    console.error('Bana Özel open error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
