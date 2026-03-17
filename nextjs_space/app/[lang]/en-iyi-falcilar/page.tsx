import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'En İyi Falcılar - Güvenilir Falcı Önerileri | ' + SITE_NAME,
  description: 'En iyi ve güvenilir falcı önerileri. Kullanıcı yorumları ile en çok tercih edilen falcılar.',
  keywords: ['en iyi falcılar', 'güvenilir falcı', 'falcı önerileri', 'popüler falcılar'],
  alternates: { canonical: `${SITE_URL}/en-iyi-falcilar` },
  openGraph: { title: 'En İyi Falcılar | ' + SITE_NAME, description: 'En güvenilir falcı önerileri.', url: `${SITE_URL}/en-iyi-falcilar` },
}

export default function EnIyiFalcilar({ params }: { params: { lang: string } }) {
  redirect(`/${params.lang}/live-tellers`)
}
