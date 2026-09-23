import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import SitePageClient from './SitePageClient'

export const dynamic = 'force-dynamic'

async function getPage(slug: string) {
  try {
    const page = await prisma.sitePage.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        title: true,
        titleEn: true,
        slug: true,
        content: true,
        contentEn: true,
      },
    })
    return page
  } catch (e) {
    console.error('getPage error', e)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; lang: string }
}): Promise<Metadata> {
  const page = await getPage(params.slug)
  if (!page) {
    return { title: 'Sayfa bulunamadı' }
  }
  return {
    title: page.title,
    description: page.title,
  }
}

export default async function SitePageView({
  params,
}: {
  params: { slug: string; lang: string }
}) {
  const page = await getPage(params.slug)
  return <SitePageClient page={page} />
}
