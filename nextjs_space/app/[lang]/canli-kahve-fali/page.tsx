import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Canlı Kahve Falı - Online Kahve Falı Baktır | ' + SITE_NAME,
  description: 'Canlı kahve falcıları ile online kahve falı. Fincanınızı gerçek uzmanlara gösterin.',
  keywords: ['canlı kahve falı', 'online kahve falı', 'kahve falı baktır', 'canlı falcı'],
  alternates: { canonical: `${SITE_URL}/canli-kahve-fali` },
  openGraph: { title: 'Canlı Kahve Falı | ' + SITE_NAME, description: 'Online kahve falı baktırın.', url: `${SITE_URL}/canli-kahve-fali` },
}

export default function CanliKahveFali({ params }: { params: { lang: string } }) {
  redirect(`/${params.lang}/fallar/kahve-fali`)
}
