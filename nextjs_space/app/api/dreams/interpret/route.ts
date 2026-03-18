import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.ABACUSAI_API_KEY,
  baseURL: 'https://routellm.abacus.ai/v1',
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Giri\u015f yapman\u0131z gerekiyor' }, { status: 401 })
    }

    const { dreamText } = await req.json()
    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length < 10) {
      return NextResponse.json({ error: 'R\u00fcyan\u0131z\u0131 en az 10 karakter olarak yaz\u0131n' }, { status: 400 })
    }
    if (dreamText.length > 3000) {
      return NextResponse.json({ error: 'R\u00fcya metni en fazla 3000 karakter olabilir' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sen deneyimli bir r\u00fcya tabircisisin. Kullan\u0131c\u0131n\u0131n anlatt\u0131\u011f\u0131 r\u00fcyay\u0131 \u0130slami, psikolojik ve geleneksel T\u00fcrk k\u00fclt\u00fcr\u00fc perspektiflerinden yorumlayacaks\u0131n.

Kurallar:
- T\u00fcrk\u00e7e yaz
- Samimi ve anla\u015f\u0131l\u0131r bir dil kullan
- \u0130slami yorum, psikolojik yorum ve genel de\u011ferlendirme b\u00f6l\u00fcmleri olsun
- En az 300 kelime yaz
- HTML kullanma, d\u00fcz metin yaz
- R\u00fcyadaki sembolleri ayr\u0131 ayr\u0131 ele al
- Olumlu ve umut verici bir ton kullan`,
        },
        {
          role: 'user',
          content: `R\u00fcyam\u0131 yorumla:\n\n${dreamText.trim()}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const interpretation = completion.choices[0]?.message?.content || 'Yorum olu\u015fturulamad\u0131.'

    return NextResponse.json({ interpretation })
  } catch (error) {
    console.error('Dream interpret error:', error)
    return NextResponse.json({ error: 'R\u00fcya yorumlan\u0131rken bir hata olu\u015ftu' }, { status: 500 })
  }
}
