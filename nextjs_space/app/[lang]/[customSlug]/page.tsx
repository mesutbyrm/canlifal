'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Lazy load the actual content pages to avoid bundling them when not needed
const BecomeTellerPage = dynamic(() => import('@/app/[lang]/falci-ol/page'), { ssr: false, loading: () => <PageLoader /> })
const AgencyPage = dynamic(() => import('@/app/[lang]/ajans/page'), { ssr: false, loading: () => <PageLoader /> })

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-gray-400">Sayfa bulunamadı</p>
      <a href="/" className="text-fuchsia-400 hover:underline text-sm">Ana Sayfaya Dön</a>
    </div>
  )
}

export default function CustomSlugPage() {
  const params = useParams()
  const slug = params?.customSlug as string
  const [pageType, setPageType] = useState<'teller' | 'ajans' | 'notfound' | 'loading'>('loading')

  useEffect(() => {
    if (!slug) { setPageType('notfound'); return }
    const checkSlug = async () => {
      try {
        const res = await fetch('/api/homepage-buttons')
        if (!res.ok) { setPageType('notfound'); return }
        const data = await res.json()
        const buttons = data.buttons || []
        // Find button whose href matches this slug
        const match = buttons.find((b: any) => {
          const btnSlug = (b.href || '').replace(/^\//, '')
          return btnSlug === slug && (b.specialBehavior === 'teller' || b.specialBehavior === 'ajans')
        })
        if (match) {
          setPageType(match.specialBehavior === 'teller' ? 'teller' : 'ajans')
        } else {
          setPageType('notfound')
        }
      } catch {
        setPageType('notfound')
      }
    }
    checkSlug()
  }, [slug])

  if (pageType === 'loading') return <PageLoader />
  if (pageType === 'teller') return <BecomeTellerPage />
  if (pageType === 'ajans') return <AgencyPage />
  return <NotFoundPage />
}
