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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, birthTime: true, zodiacSign: true, risingSign: true },
    })

    if (!user?.birthDate || !user?.zodiacSign) {
      return NextResponse.json({ error: 'Do\u011fum bilgilerinizi profil ayarlar\u0131ndan ekleyin' }, { status: 400 })
    }

    const prompt = `Kullan\u0131c\u0131 bilgileri:
- Ad: ${user.name}
- Do\u011fum tarihi: ${new Date(user.birthDate).toLocaleDateString('tr-TR')}
- Do\u011fum saati: ${user.birthTime || 'Bilinmiyor'}
- G\u00fcne\u015f burcu: ${user.zodiacSign}
- Y\u00fckselen bur\u00e7: ${user.risingSign || 'Bilinmiyor'}
- Bug\u00fcn\u00fcn tarihi: ${new Date().toLocaleDateString('tr-TR')}

Bu ki\u015fi i\u00e7in detayl\u0131 ki\u015fisel astroloji paneli olu\u015ftur:
1. Bug\u00fcnk\u00fc genel enerji (1-10 puan)
2. A\u015fk & ili\u015fki enerjisi
3. Kariyer & para enerjisi
4. Sa\u011fl\u0131k enerjisi
5. \u015eansl\u0131 say\u0131lar, renkler
6. Gezegen ge\u00e7i\u015fleri etkisi
7. Haftal\u0131k \u00f6ng\u00f6r\u00fc

HTML format\u0131nda, T\u00fcrk\u00e7e yaz.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen uzman bir astrologsun. Ki\u015fiye \u00f6zel detayl\u0131 astroloji paneli olu\u015ftur. T\u00fcrk\u00e7e yaz.' },
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
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
