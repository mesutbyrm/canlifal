import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'Online Fal - İnternetten Fal Baktır | ' + SITE_NAME,
  description: 'Online fal baktırmanın en kolay yolu. Yapay zeka ve gerçek falcılarla online fal deneyimi.',
  keywords: ['online fal', 'internet fal', 'fal baktır', 'ücretsiz fal', 'canlı fal'],
  alternates: { canonical: `${SITE_URL}/tr/online-fal` },
  openGraph: { title: 'Online Fal | ' + SITE_NAME, description: 'Online fal baktırmanın en kolay yolu.', url: `${SITE_URL}/tr/online-fal` },
}

export default function OnlineFal({ params }: { params: { lang: string } }) {
  redirect(`/${params.lang}`)
}
