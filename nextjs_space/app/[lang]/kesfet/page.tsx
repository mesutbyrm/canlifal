'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Loader2, Search, Heart, MessageCircle, Share2, ArrowLeft, Bookmark,
  Instagram, Twitter, Youtube, Play, Newspaper, Globe, MoreHorizontal
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface Post {
  id: string
  platform: string
  postType: string
  content: string | null
  mediaUrl: string | null
  externalUrl: string | null
  likeCount: number
  commentCount: number
  createdAt: string
  celebrity: { name: string; slug: string; profileImage: string | null; category?: string }
}

interface SearchResult {
  type: 'teller' | 'room' | 'fortune' | 'celebrity'
  id: string; name: string; avatar?: string | null; slug?: string
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  x: <Twitter className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  tiktok: <Play className="w-3.5 h-3.5" />,
  haber: <Newspaper className="w-3.5 h-3.5" />,
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-600',
  x: 'from-gray-700 to-gray-900',
  youtube: 'from-red-500 to-red-700',
  tiktok: 'from-cyan-400 to-pink-500',
  haber: 'from-emerald-500 to-teal-600',
}

export default function KesfetPage() {
  const router = useRouter()
  const { data: session } = useSession() || {}
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/celebrities/posts/latest?limit=30')
      const data = await res.json()
      setPosts(data.posts || [])
    } catch {}
    setLoading(false)
  }

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/search/advanced?q=${encodeURIComponent(q)}&type=all`)
      const data = await res.json()
      const results: SearchResult[] = []
      if (data.tellers) data.tellers.forEach((t: any) => results.push({ type: 'teller', id: t.id, name: t.name, avatar: t.avatar }))
      if (data.rooms) data.rooms.forEach((r: any) => results.push({ type: 'room', id: r.id, name: r.name, slug: r.slug }))
      if (data.fortunes) data.fortunes.forEach((f: any) => results.push({ type: 'fortune', id: f.id, name: f.name, slug: f.slug }))
      setSearchResults(results.slice(0, 10))
    } catch {}
    setSearching(false)
  }, [])

  const onQueryChange = (val: string) => {
    setQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (val.trim()) {
      setShowSearch(true)
      searchTimeout.current = setTimeout(() => handleSearch(val), 400)
    } else {
      setShowSearch(false)
      setSearchResults([])
    }
  }

  const handleLike = async (postId: string) => {
    if (!session) return
    try {
      await fetch(`/api/celebrities/posts/${postId}/like`, { method: 'POST' })
      setLikedPosts(prev => {
        const next = new Set(prev)
        if (next.has(postId)) next.delete(postId)
        else next.add(postId)
        return next
      })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: likedPosts.has(postId) ? p.likeCount - 1 : p.likeCount + 1 } : p))
    } catch {}
  }

  const timeAgo = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return 'Az önce'
    if (diff < 3600) return `${Math.floor(diff / 60)} dk`
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa`
    return `${Math.floor(diff / 86400)} gün`
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white pb-24">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-40 bg-[#0a0118]/95 backdrop-blur-lg border-b border-purple-500/10 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-300/50" />
              <input
                value={query}
                onChange={e => onQueryChange(e.target.value)}
                placeholder="Merak ettiğini ara"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-purple-500/20 rounded-full text-sm text-white placeholder-fuchsia-300/40 focus:border-fuchsia-400/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {showSearch && (query.trim()) && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-4 right-4 mt-2 bg-[#1a0030] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                {searching ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-fuchsia-400" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="py-1">
                    {searchResults.map(r => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={r.type === 'teller' ? `/canli-falcilar/${r.id}` : r.type === 'room' ? `/sohbet/${r.slug}` : r.type === 'fortune' ? `/fal/${r.slug}` : `/unluler/${r.slug}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                        onClick={() => { setShowSearch(false); setQuery('') }}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">
                          {r.type === 'teller' ? '⭐' : r.type === 'room' ? '💬' : r.type === 'fortune' ? '🔮' : '👤'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          <p className="text-[10px] text-fuchsia-300/50">
                            {r.type === 'teller' ? 'Falcı' : r.type === 'room' ? 'Sohbet Odası' : r.type === 'fortune' ? 'Fal Türü' : 'Ünlü'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-fuchsia-300/50 text-sm">Sonuç bulunamadı</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Posts Feed - TikTok/Instagram style */}
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-fuchsia-300/40">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Henüz paylaşım yok</p>
            <p className="text-sm mt-1">Ünlülerin paylaşımları burada görünecek</p>
          </div>
        ) : (
          <div className="divide-y divide-purple-500/10">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4"
              >
                {/* Post Header */}
                <Link href={`/unluler/${post.celebrity.slug}`} className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#0a0118] relative">
                      {post.celebrity.profileImage ? (
                        <Image src={post.celebrity.profileImage} alt={post.celebrity.name} fill className="object-cover" sizes="40px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-purple-700 to-fuchsia-800">
                          {post.celebrity.name[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{post.celebrity.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gradient-to-r ${PLATFORM_COLOR[post.platform] || 'from-gray-500 to-gray-700'} text-white flex items-center gap-0.5`}>
                        {PLATFORM_ICON[post.platform] || <Globe className="w-3 h-3" />}
                      </span>
                    </div>
                    <p className="text-[10px] text-fuchsia-300/50">{timeAgo(post.createdAt)}</p>
                  </div>
                </Link>

                {/* Post Media */}
                {post.mediaUrl && (
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 bg-purple-900/20">
                    <Image src={post.mediaUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 512px" />
                  </div>
                )}

                {/* Post Content */}
                {post.content && (
                  <p className="text-sm text-purple-100/90 mb-3 leading-relaxed whitespace-pre-wrap">
                    {post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content}
                  </p>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 group"
                  >
                    <Heart className={`w-5 h-5 transition-all group-active:scale-125 ${likedPosts.has(post.id) ? 'fill-red-500 text-red-500' : 'text-fuchsia-300/60 hover:text-red-400'}`} />
                    <span className="text-xs text-fuchsia-300/60">{post.likeCount}</span>
                  </button>
                  <Link href={`/unluler/${post.celebrity.slug}/fan-kulubu`} className="flex items-center gap-1.5 group">
                    <MessageCircle className="w-5 h-5 text-fuchsia-300/60 group-hover:text-fuchsia-300" />
                    <span className="text-xs text-fuchsia-300/60">{post.commentCount}</span>
                  </Link>
                  {post.externalUrl && (
                    <a href={post.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group ml-auto">
                      <Share2 className="w-5 h-5 text-fuchsia-300/60 group-hover:text-fuchsia-300" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
