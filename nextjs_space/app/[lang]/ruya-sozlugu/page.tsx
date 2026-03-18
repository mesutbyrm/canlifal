'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Search, BookOpen, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface DreamSymbol {
  id: string
  name: string
  slug: string
  letter: string
  meaning: string
}

const TURKISH_ALPHABET = 'ABC\u00c7DEFG\u011eHI\u0130JKLMNO\u00d6PRS\u015eTU\u00dcVYZ'.split('')

export default function DreamDictionaryPage() {
  const { lang } = useParams()
  const router = useRouter()
  const [symbols, setSymbols] = useState<DreamSymbol[]>([])
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({})
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSymbols()
  }, [selectedLetter])

  const fetchSymbols = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedLetter) params.set('letter', selectedLetter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/dream-symbols?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSymbols(data.symbols)
        const counts: Record<string, number> = {}
        data.letterCounts.forEach((lc: any) => { counts[lc.letter] = lc._count.id })
        setLetterCounts(counts)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSearch = () => {
    setSelectedLetter(null)
    fetchSymbols()
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full mb-4">
          <BookOpen size={18} />
          <span>R\u00fcya S\u00f6zl\u00fc\u011f\u00fc</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">R\u00fcya Sembolleri A-Z</h1>
        <p className="text-white/60">R\u00fcyan\u0131zdaki sembollerin anlamlar\u0131n\u0131 ke\u015ffedin</p>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2 max-w-md mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Sembol ara... (\u00f6r: Y\u0131lan, Su, Ate\u015f)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl transition-colors">
          Ara
        </button>
      </div>

      {/* Alphabet Bar */}
      <div className="flex flex-wrap justify-center gap-1 mb-8">
        <button
          onClick={() => { setSelectedLetter(null); setSearchQuery('') }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !selectedLetter ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          T\u00fcm\u00fc
        </button>
        {TURKISH_ALPHABET.map((letter) => (
          <button
            key={letter}
            onClick={() => { setSelectedLetter(letter); setSearchQuery('') }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedLetter === letter ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            } ${!letterCounts[letter] ? 'opacity-30' : ''}`}
            disabled={!letterCounts[letter]}
          >
            {letter}
            {letterCounts[letter] ? <span className="text-[10px] ml-0.5 opacity-60">({letterCounts[letter]})</span> : null}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={32} /></div>
      ) : symbols.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Sparkles size={48} className="mx-auto mb-4 opacity-40" />
          <p>Sonu\u00e7 bulunamad\u0131</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {symbols.map((symbol) => (
            <Link
              key={symbol.id}
              href={`/${lang}/ruya-sozlugu/${symbol.slug}`}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-purple-500/20 text-purple-300 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
                      {symbol.letter}
                    </span>
                    <h3 className="text-white font-semibold">{symbol.name}</h3>
                  </div>
                  <p className="text-white/50 text-sm line-clamp-2">{symbol.meaning}</p>
                </div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-purple-400 transition-colors mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
