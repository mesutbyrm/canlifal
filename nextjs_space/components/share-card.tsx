'use client'

import { useState, useRef, useCallback } from 'react'
import { Share2, Download, X, Copy, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareCardProps {
  fortuneId?: string
  postId?: string
  trigger?: React.ReactNode
}

interface CardData {
  type: string
  fortuneType?: string
  typeLabel?: string
  userName: string
  userAvatar?: string
  summary?: string
  content?: string
  likes?: number
  comments?: number
  date: string
  shareUrl: string
}

const GRADIENT_BG = [
  'from-purple-900 via-indigo-900 to-blue-900',
  'from-pink-900 via-purple-900 to-indigo-900',
  'from-emerald-900 via-teal-900 to-cyan-900',
  'from-orange-900 via-red-900 to-pink-900',
]

export default function ShareCard({ fortuneId, postId, trigger }: ShareCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const fetchCard = useCallback(async () => {
    setLoading(true)
    try {
      const params = fortuneId ? `fortuneId=${fortuneId}` : `postId=${postId}`
      const res = await fetch(`/api/share-card?${params}`)
      const data = await res.json()
      if (data.card) setCardData(data.card)
    } catch (e) {
      console.error('Share card fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [fortuneId, postId])

  const handleOpen = () => {
    setIsOpen(true)
    fetchCard()
  }

  const handleCopyLink = async () => {
    if (cardData?.shareUrl) {
      try {
        await navigator.clipboard.writeText(cardData.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (e) {
        console.error('Copy failed:', e)
      }
    }
  }

  const handleNativeShare = async () => {
    if (cardData && navigator.share) {
      try {
        await navigator.share({
          title: cardData.typeLabel || 'CanliFal Paylaşım',
          text: cardData.summary || cardData.content || '',
          url: cardData.shareUrl
        })
      } catch (e) {
        // User cancelled
      }
    }
  }

  const gradientIdx = (fortuneId || postId || '').charCodeAt(0) % GRADIENT_BG.length

  return (
    <>
      <div onClick={handleOpen} className="cursor-pointer">
        {trigger || (
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm transition">
            <Share2 className="w-4 h-4" />
            Paylaş
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md"
            >
              {/* Close */}
              <div className="flex justify-end mb-2">
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {loading ? (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-12 text-center">
                  <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : cardData ? (
                <>
                  {/* Card Preview */}
                  <div ref={cardRef} className={`bg-gradient-to-br ${GRADIENT_BG[gradientIdx]} rounded-2xl p-6 shadow-2xl border border-white/10`}>
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
                        {cardData.userAvatar ? (
                          <img src={cardData.userAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          cardData.userName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{cardData.userName}</div>
                        <div className="text-xs text-white/60">
                          {new Date(cardData.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>

                    {/* Type Badge */}
                    {cardData.typeLabel && (
                      <div className="inline-block px-3 py-1 bg-white/15 rounded-full text-sm text-white/90 mb-3">
                        {cardData.typeLabel}
                      </div>
                    )}

                    {/* Content */}
                    <p className="text-white/90 text-sm leading-relaxed mb-4">
                      {cardData.summary || cardData.content}
                    </p>

                    {/* Social Stats */}
                    {(cardData.likes !== undefined || cardData.comments !== undefined) && (
                      <div className="flex gap-4 text-white/60 text-sm">
                        {cardData.likes !== undefined && <span>❤️ {cardData.likes} beğeni</span>}
                        {cardData.comments !== undefined && <span>💬 {cardData.comments} yorum</span>}
                      </div>
                    )}

                    {/* Watermark */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/40">canlifal.com</span>
                      <span className="text-lg">🔮</span>
                    </div>
                  </div>

                  {/* Share Actions */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-white text-sm transition"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Kopyalandı!' : 'Link Kopyala'}
                    </button>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={handleNativeShare}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-sm transition"
                      >
                        <Share2 className="w-4 h-4" />
                        Paylaş
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center text-purple-300">
                  Kart yüklenemedi
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
