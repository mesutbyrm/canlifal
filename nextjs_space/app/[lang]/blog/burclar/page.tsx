'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Star, Eye, Clock, ArrowRight, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

const ZODIAC_SIGNS = [
  { key: 'koc', name: 'Koç', emoji: '♈', dates: '21 Mart - 19 Nisan', color: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30' },
  { key: 'boga', name: 'Boğa', emoji: '♉', dates: '20 Nisan - 20 Mayıs', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
  { key: 'ikizler', name: 'İkizler', emoji: '♊', dates: '21 Mayıs - 20 Haziran', color: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30' },
  { key: 'yengec', name: 'Yengeç', emoji: '♋', dates: '21 Haziran - 22 Temmuz', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  { key: 'aslan', name: 'Aslan', emoji: '♌', dates: '23 Temmuz - 22 Ağustos', color: 'from-orange-500/20 to-yellow-500/20', border: 'border-orange-500/30' },
  { key: 'basak', name: 'Başak', emoji: '♍', dates: '23 Ağustos - 22 Eylül', color: 'from-lime-500/20 to-green-500/20', border: 'border-lime-500/30' },
  { key: 'terazi', name: 'Terazi', emoji: '♎', dates: '23 Eylül - 22 Ekim', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' },
  { key: 'akrep', name: 'Akrep', emoji: '♏', dates: '23 Ekim - 21 Kasım', color: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30' },
  { key: 'yay', name: 'Yay', emoji: '♐', dates: '22 Kasım - 21 Aralık', color: 'from-indigo-500/20 to-blue-500/20', border: 'border-indigo-500/30' },
  { key: 'oglak', name: 'Oğlak', emoji: '♑', dates: '22 Aralık - 19 Ocak', color: 'from-stone-500/20 to-gray-500/20', border: 'border-stone-500/30' },
  { key: 'kova', name: 'Kova', emoji: '♒', dates: '20 Ocak - 18 Şubat', color: 'from-sky-500/20 to-blue-500/20', border: 'border-sky-500/30' },
  { key: 'balik', name: 'Balık', emoji: '♓', dates: '19 Şubat - 20 Mart', color: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30' },
]

interface BlogPost {
  id: string
  slug: string
  titleTr: string
  descTr: string
  coverImage: string
  readTime: number
  views: number
  publishedAt: string | null
  createdAt: string
}

interface ZodiacData {
  sign: string
  posts: BlogPost[]
}

export default function BurclarPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const [zodiacData, setZodiacData] = useState<ZodiacData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSign, setSelectedSign] = useState<string | null>(null)
  const [signPosts, setSignPosts] = useState<BlogPost[]>([])
  const [signLoading, setSignLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchZodiac = async () => {
      try {
        const res = await fetch('/api/blog/zodiac')
        if (res.ok) {
          const data = await res.json()
          setZodiacData(data.signs || [])
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    fetchZodiac()
  }, [])

  const fetchSignPosts = async (sign: string) => {
    setSelectedSign(sign)
    setSignLoading(true)
    try {
      const res = await fetch(`/api/blog/zodiac?sign=${sign}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setSignPosts(data.posts || [])
      }
    } catch (e) { console.error(e) }
    setSignLoading(false)
  }

  const getSignInfo = (key: string) => ZODIAC_SIGNS.find(s => s.key === key)
  const getPostCount = (sign: string) => zodiacData.find(s => s.sign === sign)?.posts?.length || 0

  const formatDate = (d: string | null) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) }
    catch { return '' }
  }

  if (!mounted) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/30 to-gray-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-10 pb-28">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" /> Astroloji & Burçlar
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Burç Yorumları
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Burcunuza özel yazıları keşfedin. Günlük, haftalık ve aylık burç yorumları, astroloji rehberleri ve daha fazlası.
          </motion.p>
        </div>

        {/* Back to Blog Link */}
        <div className="mb-8">
          <Link href={`/blog`} className="text-sm text-purple-400 hover:text-purple-300 transition">
            ← Blog&apos;a Dön
          </Link>
        </div>

        {/* Zodiac Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
          {ZODIAC_SIGNS.map((sign, i) => {
            const postCount = getPostCount(sign.key)
            const isSelected = selectedSign === sign.key
            return (
              <motion.button
                key={sign.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => fetchSignPosts(sign.key)}
                className={`relative p-4 rounded-2xl border transition-all duration-300 text-center group ${
                  isSelected
                    ? `bg-gradient-to-br ${sign.color} ${sign.border} shadow-lg scale-[1.02]`
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-3xl mb-2">{sign.emoji}</div>
                <div className="text-white font-semibold text-sm">{sign.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">{sign.dates}</div>
                {postCount > 0 && (
                  <div className="mt-2 text-xs text-purple-400 font-medium">{postCount} yazı</div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Selected Sign Posts */}
        {selectedSign && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{getSignInfo(selectedSign)?.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">{getSignInfo(selectedSign)?.name} Yazıları</h2>
                <p className="text-gray-400 text-sm">{getSignInfo(selectedSign)?.dates}</p>
              </div>
            </div>

            {signLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : signPosts.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <Star className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Bu burç için henüz yazı bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition group"
                    >
                      {post.coverImage && (
                        <div className="relative aspect-video bg-gray-800">
                          <Image src={post.coverImage} alt={post.titleTr} fill className="object-cover group-hover:scale-105 transition duration-500" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-white font-semibold line-clamp-2 mb-2 group-hover:text-purple-300 transition">{post.titleTr}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{post.descTr}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} dk</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views}</span>
                          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* All Signs with Latest Posts (overview when no sign selected) */}
        {!selectedSign && zodiacData.length > 0 && (
          <div className="space-y-10">
            {zodiacData.filter(z => z.posts.length > 0).map((zd) => {
              const signInfo = getSignInfo(zd.sign)
              if (!signInfo) return null
              return (
                <motion.div
                  key={zd.sign}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{signInfo.emoji}</span>
                      <h2 className="text-xl font-bold text-white">{signInfo.name}</h2>
                      <span className="text-sm text-gray-500">({zd.posts.length} yazı)</span>
                    </div>
                    <button
                      onClick={() => fetchSignPosts(zd.sign)}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                    >
                      Tümünü Gör <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {zd.posts.slice(0, 3).map(post => (
                      <Link key={post.id} href={`/blog/${post.slug}`}>
                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 hover:border-purple-500/30 transition group">
                          <h3 className="text-white font-medium line-clamp-2 mb-2 group-hover:text-purple-300 transition text-sm">{post.titleTr}</h3>
                          <p className="text-gray-500 text-xs line-clamp-2 mb-2">{post.descTr}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{post.readTime} dk</span>
                            <span>•</span>
                            <span>{post.views} görüntülenme</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {!selectedSign && zodiacData.every(z => z.posts.length === 0) && (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Yakında Burada!</h3>
            <p className="text-gray-400">Burç yazıları çok yakında eklenecektir. Takipte kalın!</p>
          </div>
        )}
      </div>
    </div>
  )
}
