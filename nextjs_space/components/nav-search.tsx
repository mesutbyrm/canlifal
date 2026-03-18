'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'

interface SearchResult {
  type: string
  id: string
  title: string
  href: string
  icon: string
  image?: string
}

const TYPE_LABELS: Record<string, { tr: string; en: string }> = {
  fortune: { tr: 'Fal', en: 'Fortune' },
  page: { tr: 'Sayfa', en: 'Page' },
  game: { tr: 'Oyun', en: 'Game' },
  user: { tr: 'Kullanıcı', en: 'User' },
}

export default function NavSearch() {
  const { language } = useLanguage()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${language}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    setResults([])
    router.push(`/${language}${result.href}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Toggle Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg bg-fuchsia-900/60 hover:bg-fuchsia-800/60 text-fuchsia-300 transition-colors"
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-medium">{'Ara'}</span>
        </button>
      ) : (
        <div className="flex items-center">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              placeholder={'Ara...'}
              className="w-36 sm:w-48 h-8 pl-8 pr-8 text-sm bg-fuchsia-900/40 border border-fuchsia-500/40 rounded-full text-white placeholder-fuchsia-300/60 focus:outline-none focus:border-fuchsia-400 transition-all"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-400/60" />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fuchsia-400/60 hover:text-fuchsia-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { setIsOpen(false); setQuery(''); setResults([]) }}
            className="ml-1 p-1 text-fuchsia-400/60 hover:text-fuchsia-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (query.trim().length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-h-[60vh] overflow-y-auto bg-purple-800/95 backdrop-blur-xl border border-purple-400/40 rounded-xl shadow-2xl shadow-purple-900/50 z-[100]"
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-white/70 text-sm">
                {'Sonuç bulunamadı'}
              </div>
            ) : (
              <div className="py-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-purple-600/60 text-white'
                        : 'text-white hover:bg-purple-600/40'
                    }`}
                  >
                    {result.image ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-fuchsia-500/30">
                        <Image src={result.image} alt={result.title} width={32} height={32} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-fuchsia-900/40 flex items-center justify-center text-base flex-shrink-0">
                        {result.icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-[10px] text-white/60">
                        {TYPE_LABELS[result.type]?.['tr'] || result.type}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
