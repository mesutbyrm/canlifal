import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Canlı Falcılar - Online Fal Baktır | ' + SITE_NAME,
  description: 'En iyi canlı falcılarla birebir görüşme. Online fal baktırın, geleceğinizi keşfedin.',
  keywords: ['canlı falcılar', 'online falcı', 'canlı fal', 'fal baktır'],
  alternates: { canonical: `${SITE_URL}/canli-falcilar` },
  openGraph: { title: 'Canlı Falcılar | ' + SITE_NAME, description: 'En iyi canlı falcılarla online fal baktırın.', url: `${SITE_URL}/canli-falcilar` },
}

export default function CanlaFalcilar({ params }: { params: { lang: string } }) {
  redirect(`/${params.lang}/live-tellers`)
}
