'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Loader2, Tag, Share2 } from 'lucide-react'
import Link from 'next/link'

export default function DreamSymbolDetailPage() {
  const { lang, slug } = useParams()
  const router = useRouter()
  const [symbol, setSymbol] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/dream-symbols/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSymbol(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-400" size={32} /></div>
  if (!symbol) return <div className="text-center py-20 text-white/40">Sembol bulunamad\u0131</div>

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} /> Geri
      </button>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-500/20 text-purple-300 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl">
            {symbol.letter}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{symbol.name}</h1>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <BookOpen size={14} /> R\u00fcya S\u00f6zl\u00fc\u011f\u00fc
            </div>
          </div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-purple-300 font-semibold mb-2">K\u0131sa Anlam</h3>
          <p className="text-white/80">{symbol.meaning}</p>
        </div>

        {symbol.detailedMeaning && (
          <div className="prose prose-invert max-w-none mb-6">
            <h3 className="text-white font-semibold mb-3">Detayl\u0131 Yorum</h3>
            <div className="text-white/70 leading-relaxed" dangerouslySetInnerHTML={{ __html: symbol.detailedMeaning }} />
          </div>
        )}

        {symbol.relatedSymbols?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Tag size={16} /> \u0130lgili Semboller</h3>
            <div className="flex flex-wrap gap-2">
              {symbol.relatedSymbols.map((rs: string) => (
                <span key={rs} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm text-white/60">{rs}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href={`/${lang}/ruya-sozlugu`} className="text-purple-400 hover:text-purple-300 transition-colors">
          \u2190 T\u00fcm Sembollere D\u00f6n
        </Link>
      </div>
    </div>
  )
}
