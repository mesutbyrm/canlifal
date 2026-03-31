'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Loader2, Share2, ChevronRight, Moon, Star, Brain, BookMarked, Sparkles, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import RelatedContentLinks from '@/components/related-content-links'

interface DreamSymbolData {
  id: string
  name: string
  slug: string
  letter: string
  meaning: string
  detailedMeaning: string | null
  relatedSymbols: string[]
  isPublished: boolean
  createdAt: string
  updatedAt: string
  relatedDreams?: { name: string; slug: string }[]
}

export default function DreamSymbolDetailPage() {
  const { lang, slug } = useParams()
  const router = useRouter()
  const [symbol, setSymbol] = useState<DreamSymbolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  useEffect(() => {
    fetch(`/api/dream-symbols/${slug}`)
      .then(r => {
        const ct = r.headers.get('content-type') || ''
        if (r.ok && ct.includes('application/json')) return r.json()
        return null
      })
      .then(data => { setSymbol(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <Moon className="animate-pulse text-purple-400" size={40} />
      <p className="text-white/40 text-sm">Rüya tabiri yükleniyor...</p>
    </div>
  )
  if (!symbol) return (
    <div className="text-center py-20">
      <Moon className="mx-auto mb-4 text-white/20" size={48} />
      <p className="text-white/40 text-lg">Sembol bulunamadı</p>
      <Link href="/ruya-sozlugu" className="mt-4 inline-block text-purple-400 hover:text-purple-300 text-sm">← Rüya Sözlüğüne Dön</Link>
    </div>
  )

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://canlifal.com'
  const symbolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Rüyada ${symbol.name} Görmek Ne Anlama Gelir?`,
    description: symbol.meaning || '',
    image: `${siteUrl}/fortunes/dream.jpg`,
    author: { '@type': 'Organization', name: 'Canlifal', url: siteUrl },
    publisher: { '@type': 'Organization', name: 'Canlifal', url: siteUrl, logo: { '@type': 'ImageObject', url: `${siteUrl}/canlifal-logo.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/ruya-sozlugu/${slug}` },
    keywords: [`rüyada ${symbol.name?.toLowerCase()} görmek`, `${symbol.name?.toLowerCase()} rüya tabiri`, 'rüya sözlüğü', 'rüya tabiri islami', 'rüya tabiri psikolojik'].join(', '),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Rüya Sözlüğü', item: `${siteUrl}/ruya-sozlugu` },
      { '@type': 'ListItem', position: 3, name: symbol.name, item: `${siteUrl}/ruya-sozlugu/${slug}` },
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Rüyada ${symbol.name} görmek ne anlama gelir?`,
        acceptedAnswer: { '@type': 'Answer', text: symbol.meaning },
      },
      {
        '@type': 'Question',
        name: `Rüyada ${symbol.name} görmek iyi mi kötü mü?`,
        acceptedAnswer: { '@type': 'Answer', text: `Rüyada ${symbol.name.toLowerCase()} görmek genel olarak ${symbol.meaning?.toLowerCase()?.includes('hayır') || symbol.meaning?.toLowerCase()?.includes('kötü') ? 'dikkat edilmesi gereken bir işaret' : 'olumlu bir işaret'} olarak yorumlanır. Detaylı yorumu rüyanın koşullarına göre değişebilir.` },
      },
    ],
  }

  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(symbolJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Breadcrumb */}
      <nav className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        <ol className="flex items-center gap-1.5 text-xs text-white/40 flex-wrap">
          <li><Link href="/" className="hover:text-white/70 transition-colors">Ana Sayfa</Link></li>
          <li><ChevronRight size={12} /></li>
          <li><Link href="/ruya-sozlugu" className="hover:text-white/70 transition-colors">Rüya Sözlüğü</Link></li>
          <li><ChevronRight size={12} /></li>
          <li className="text-purple-300 font-medium">{symbol.name}</li>
        </ol>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-4 pt-4 pb-6">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-slate-900/60 border border-white/10">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 text-6xl">🌙</div>
            <div className="absolute top-12 right-12 text-4xl">✨</div>
            <div className="absolute bottom-8 left-1/3 text-3xl">⭐</div>
            <div className="absolute bottom-4 right-8 text-5xl">🔮</div>
          </div>

          <div className="relative z-10 p-6 md:p-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Moon size={12} /> Rüya Tabiri
              </span>
              <span className="bg-white/5 border border-white/10 text-white/50 px-3 py-1 rounded-full text-xs">
                {symbol.letter} Harfi
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4">
              Rüyada {symbol.name} Görmek Ne Anlama Gelir?
            </h1>

            <p className="text-white/60 text-base md:text-lg leading-relaxed max-w-3xl">
              <strong className="text-white/80">Rüyada {symbol.name.toLowerCase()} görmek</strong>, en çok merak edilen rüya tabirlerinden biridir.
              {symbol.meaning && <> Bu rüya genellikle <strong className="text-purple-300">{symbol.meaning.length > 150 ? symbol.meaning.substring(0, 150) + '...' : symbol.meaning}</strong> ile ilişkilendirilir.</>}
            </p>

            {/* Share & Actions */}
            <div className="flex items-center gap-3 mt-6">
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white transition-all"
                >
                  <Share2 size={14} /> Paylaş
                </button>
                {showShareMenu && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-white/10 rounded-xl p-2 min-w-[200px] z-50 shadow-xl">
                    <button
                      onClick={() => { handleCopyLink(); setShowShareMenu(false) }}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
                    </button>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Rüyada ${symbol.name} Görmek Ne Anlama Gelir?`)}&url=${encodeURIComponent(`${siteUrl}/ruya-sozlugu/${slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <ExternalLink size={14} /> Twitter/X
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Rüyada ${symbol.name} Görmek - ${siteUrl}/ruya-sozlugu/${slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => setShowShareMenu(false)}
                    >
                      <ExternalLink size={14} /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 pb-12">
        {/* Short Meaning Box */}
        <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <div className="bg-purple-500/20 rounded-lg p-2 mt-0.5">
              <Sparkles className="text-purple-300" size={18} />
            </div>
            <div>
              <h2 className="text-purple-300 font-semibold text-sm mb-1">Kısa Tabir</h2>
              <p className="text-white/80 leading-relaxed">{symbol.meaning}</p>
            </div>
          </div>
        </div>

        {/* Detailed Meaning - Rendered HTML */}
        {symbol.detailedMeaning && (
          <div className="dream-content mb-8">
            <div
              className="prose prose-invert max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-white/70 prose-p:leading-relaxed prose-p:mb-4
                prose-strong:text-white/90
                prose-ul:text-white/70 prose-ul:my-4
                prose-li:text-white/70 prose-li:my-1
                prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 hover:prose-a:underline
                prose-img:rounded-xl prose-img:border prose-img:border-white/10
              "
              dangerouslySetInnerHTML={{ __html: symbol.detailedMeaning }}
            />
          </div>
        )}

        {/* If no detailedMeaning, show a simple message */}
        {!symbol.detailedMeaning && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-center">
            <Moon className="mx-auto mb-3 text-purple-400/50" size={32} />
            <p className="text-white/50">Bu sembol için detaylı tabir henüz eklenmemiştir.</p>
          </div>
        )}

        {/* Related Dreams Section */}
        {symbol.relatedDreams && symbol.relatedDreams.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
              <BookMarked size={20} className="text-purple-400" /> Benzer Rüyalar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {symbol.relatedDreams.map((rd) => (
                <Link
                  key={rd.slug}
                  href={`/ruya-sozlugu/${rd.slug}`}
                  className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl p-4 transition-all"
                >
                  <div className="bg-purple-500/20 rounded-lg p-2 group-hover:bg-purple-500/30 transition-colors">
                    <Moon size={16} className="text-purple-300" />
                  </div>
                  <div>
                    <span className="text-white/80 group-hover:text-white text-sm font-medium transition-colors">
                      Rüyada {rd.name} Görmek
                    </span>
                  </div>
                  <ChevronRight size={14} className="ml-auto text-white/30 group-hover:text-purple-400 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Symbols as Tags (fallback if no relatedDreams) */}
        {(!symbol.relatedDreams || symbol.relatedDreams.length === 0) && symbol.relatedSymbols?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
              <BookMarked size={20} className="text-purple-400" /> İlgili Semboller
            </h2>
            <div className="flex flex-wrap gap-2">
              {symbol.relatedSymbols.map((rs: string) => (
                <span key={rs} className="bg-white/5 border border-white/10 hover:border-purple-500/30 px-4 py-2 rounded-full text-sm text-white/60 hover:text-white/80 transition-colors cursor-default">
                  {rs}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-500/20 rounded-2xl p-6 md:p-8 mb-8">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-2">Rüyanızı Daha Detaylı Yorumlatın</h3>
            <p className="text-white/50 text-sm mb-4">AI destekli rüya yorumu ile rüyanızın anlamını keşfedin</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/ruya-yorumu"
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <Sparkles size={16} /> AI Rüya Yorumu
              </Link>
              <Link
                href="/ruya-sozlugu"
                className="bg-white/10 hover:bg-white/15 text-white/70 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                <BookOpen size={16} /> Tüm Semboller
              </Link>
            </div>
          </div>
        </section>
      </article>

      {/* Related Content Links */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <RelatedContentLinks
          currentSlug="ruya-sozlugu"
          relatedSlugs={['ruya', 'ruya-yorumu', 'kahve-fali', 'tarot-fali', 'istihare', 'melek-kartlari']}
          introText="Rüya sembollerinin anlamlarını öğrendiniz. Rüya tabirlerinizi daha detaylı yorumlatmak veya farklı fal türlerini keşfetmek için aşağıdaki bağlantıları inceleyebilirsiniz."
        />
      </div>
    </div>
  )
}
