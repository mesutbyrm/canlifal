import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Canlı Tarot - Online Tarot Falı Baktır | ' + SITE_NAME,
  description: 'Canlı tarot falcıları ile online tarot seansı. Gerçek tarot uzmanlarından canlı yorum alın.',
  keywords: ['canlı tarot', 'online tarot falı', 'tarot baktır', 'canlı tarot falcısı'],
  alternates: { canonical: `${SITE_URL}/tr/canli-tarot` },
  openGraph: { title: 'Canlı Tarot | ' + SITE_NAME, description: 'Online tarot falı baktırın.', url: `${SITE_URL}/tr/canli-tarot` },
}

export default function CanliTarot({ params }: { params: { lang: string } }) {
  redirect(`/${params.lang}/fortunes/tarot`)
}
