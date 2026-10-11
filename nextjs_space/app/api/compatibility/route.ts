export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

const ZODIAC_LIST = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık']

export async function POST(req: NextRequest) {
  try {
    const { sign1, sign2, risingSign1, risingSign2, moonSign1, moonSign2 } = await req.json()
    if (!sign1 || !sign2) return NextResponse.json({ error: 'Burçlar gerekli' }, { status: 400 })

    let prompt = `${sign1} burcu ile ${sign2} burcu arasındaki aşk, arkadaşlık ve iş uyumunu detaylı analiz et.`
    if (risingSign1 && risingSign2) prompt += ` Yükselen burçlar: ${risingSign1} ve ${risingSign2}.`
    if (moonSign1 && moonSign2) prompt += ` Ay burçları: ${moonSign1} ve ${moonSign2}.`
    prompt += ' Her kategori için 0-100 arası uyum puanı ver. HTML formatında yaz. Türkçe yaz.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen uzman bir astrologsun. Burç uyumu analizleri yap. Detaylı ve içgörülü ol. Türkçe yaz. HTML formatında yaz.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
    })

    return NextResponse.json({
      analysis: completion.choices[0]?.message?.content || '',
      signs: { sign1, sign2 },
    })
  } catch (error) {
    console.error('Compatibility error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
