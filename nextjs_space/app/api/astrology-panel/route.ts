export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
    const userId = authUser.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, birthTime: true, zodiacSign: true, risingSign: true },
    })

    if (!user?.birthDate || !user?.zodiacSign) {
      return NextResponse.json({ error: 'Doğum bilgilerinizi profil ayarlarından ekleyin' }, { status: 400 })
    }

    const prompt = `Kullanıcı bilgileri:
- Ad: ${user.name}
- Doğum tarihi: ${new Date(user.birthDate).toLocaleDateString('tr-TR')}
- Doğum saati: ${user.birthTime || 'Bilinmiyor'}
- Güneş burcu: ${user.zodiacSign}
- Yükselen burç: ${user.risingSign || 'Bilinmiyor'}
- Bugünün tarihi: ${new Date().toLocaleDateString('tr-TR')}

Bu kişi için detaylı kişisel astroloji paneli oluştur:
1. Bugünkü genel enerji (1-10 puan)
2. Aşk & ilişki enerjisi
3. Kariyer & para enerjisi
4. Sağlık enerjisi
5. Şanslı sayılar, renkler
6. Gezegen geçişleri etkisi
7. Haftalık öngörü

HTML formatında, Türkçe yaz.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen uzman bir astrologsun. Kişiye özel detaylı astroloji paneli oluştur. Türkçe yaz.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    })

    return NextResponse.json({
      analysis: completion.choices[0]?.message?.content || '',
      user: {
        name: user.name,
        zodiacSign: user.zodiacSign,
        risingSign: user.risingSign,
        birthDate: user.birthDate,
      },
    })
  } catch (error) {
    console.error('Astrology panel error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
