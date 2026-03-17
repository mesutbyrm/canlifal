'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/language-context'
import { useSiteTheme } from '@/lib/theme-context'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PageData {
  id: string
  title: string
  titleEn: string | null
  slug: string
  content: string
  contentEn: string | null
}

export default function SitePageView({ params }: { params: { slug: string; lang: string } }) {
  const { language } = useLanguage()
  const { theme } = useSiteTheme()
  const [page, setPage] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isMystical = theme === 'mystical'
  const textColor = isMystical ? 'text-white' : 'text-gray-900'
  const subText = isMystical ? 'text-fuchsia-200' : 'text-gray-500'
  const cardBg = isMystical ? 'bg-[#1a0a2e]/80 border-fuchsia-900/30' : 'bg-white border-gray-200'

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/site-pages/${params.slug}`)
        if (res.ok) {
          const data = await res.json()
          setPage(data.page)
        } else {
          setNotFound(true)
        }
      } catch (e) {
        console.error(e)
        setNotFound(true)
      }
      setIsLoading(false)
    }
    fetchPage()
  }, [params.slug])

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isMystical ? 'bg-[#0f0520]' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
      </div>
    )
  }

  if (notFound || !page) {
    return (
      <div className={`min-h-screen ${isMystical ? 'bg-[#0f0520]' : 'bg-gray-50'} flex flex-col items-center justify-center gap-4`}>
        <p className={`text-xl ${textColor}`}>{language === 'tr' ? 'Sayfa bulunamad\u0131' : 'Page not found'}</p>
        <Link href={`/`} className={`text-sm ${subText} underline`}>
          {language === 'tr' ? 'Ana Sayfaya D\u00f6n' : 'Back to Home'}
        </Link>
      </div>
    )
  }

  const title = page.title
  const content = page.content

  return (
    <div className={`min-h-screen ${isMystical ? 'bg-[#0f0520]' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/`} className={`p-2 rounded-lg ${cardBg} border`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-2xl sm:text-3xl font-bold ${textColor}`}>{title}</h1>
        </div>
        <div className={`${cardBg} border rounded-xl p-6 sm:p-8`}>
          <div
            className={`prose max-w-none ${isMystical ? 'prose-invert prose-fuchsia' : 'prose-gray'}`}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  )
}
