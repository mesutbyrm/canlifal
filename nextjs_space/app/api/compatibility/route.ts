export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY || '',
  baseURL: 'https://routellm.abacus.ai/v1',
})

const ZODIAC_LIST = ['Ko\u00e7', 'Bo\u011fa', '\u0130kizler', 'Yenge\u00e7', 'Aslan', 'Ba\u015fak', 'Terazi', 'Akrep', 'Yay', 'O\u011flak', 'Kova', 'Bal\u0131k']

export async function POST(req: NextRequest) {
  try {
    const { sign1, sign2, risingSign1, risingSign2, moonSign1, moonSign2 } = await req.json()
    if (!sign1 || !sign2) return NextResponse.json({ error: 'Bur\u00e7lar gerekli' }, { status: 400 })

    let prompt = `${sign1} burcu ile ${sign2} burcu aras\u0131ndaki a\u015fk, arkada\u015fl\u0131k ve i\u015f uyumunu detayl\u0131 analiz et.`
    if (risingSign1 && risingSign2) prompt += ` Y\u00fckselen bur\u00e7lar: ${risingSign1} ve ${risingSign2}.`
    if (moonSign1 && moonSign2) prompt += ` Ay bur\u00e7lar\u0131: ${moonSign1} ve ${moonSign2}.`
    prompt += ' Her kategori i\u00e7in 0-100 aras\u0131 uyum puan\u0131 ver. HTML format\u0131nda yaz. T\u00fcrk\u00e7e yaz.'

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sen uzman bir astrologsun. Bur\u00e7 uyumu analizleri yap. Detayl\u0131 ve i\u00e7g\u00f6r\u00fcl\u00fc ol. T\u00fcrk\u00e7e yaz. HTML format\u0131nda yaz.' },
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
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
