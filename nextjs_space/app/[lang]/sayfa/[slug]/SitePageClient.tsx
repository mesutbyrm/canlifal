'use client'

import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageData {
  id: string
  title: string
  titleEn: string | null
  slug: string
  content: string
  contentEn: string | null
}

export default function SitePageClient({ page }: { page: PageData | null }) {
  const { theme } = useSiteTheme()

  const isDark =
    theme === 'mystical' ||
    theme === 'canlidark' ||
    theme === 'falclub' ||
    theme === 'cosmic'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const subText = isDark ? 'text-fuchsia-200' : 'text-gray-500'
  const cardBg = isDark
    ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30'
    : 'bg-white border-gray-200'

  if (!page) {
    return (
      <div
        className={`min-h-screen ${
          isDark ? 'bg-transparent' : 'bg-gray-50'
        } flex flex-col items-center justify-center gap-4`}
      >
        <p className={`text-xl ${textColor}`}>{'Sayfa bulunamadı'}</p>
        <Link href={`/`} className={`text-sm ${subText} underline`}>
          {'Ana Sayfaya Dön'}
        </Link>
      </div>
    )
  }

  const title = page.title
  const content = page.content

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-transparent' : 'bg-gray-50'
      } p-4 sm:p-6`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/`} className={`p-2 rounded-lg ${cardBg} border`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textColor}`}>
            {title}
          </h1>
        </div>
        <div className={`${cardBg} border rounded-xl p-6 sm:p-8`}>
          <div
            className={`prose max-w-none ${
              isDark ? 'prose-invert prose-fuchsia' : 'prose-gray'
            }`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  )
}
