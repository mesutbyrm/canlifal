'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, X, Check, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

interface ShareToSocialProps {
  fortuneId?: string
  fortuneType: string
  content: string
  onClose?: () => void
}

export default function ShareToSocial({ fortuneId, fortuneType, content, onClose }: ShareToSocialProps) {
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [error, setError] = useState('')
  const [editedContent, setEditedContent] = useState('')

  const handleOpen = () => {
    // Prepare content - take first 500 chars of the fortune
    const preview = content.length > 500 ? content.substring(0, 500) + '...' : content
    setEditedContent(preview)
    setIsOpen(true)
    setShared(false)
    setError('')
  }

  const handleShare = async () => {
    if (!editedContent.trim() || sharing) return
    setSharing(true)
    setError('')

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent,
          postType: 'fortune',
          fortuneType,
          fortuneId: fortuneId || null,
          isPublic: true
        })
      })

      if (res.ok) {
        setShared(true)
        setTimeout(() => {
          setIsOpen(false)
          onClose?.()
        }, 1500)
      } else {
        const data = await res.json()
        setError(data.error || (language === 'tr' ? 'Paylaşılamadı' : 'Failed to share'))
      }
    } catch (err) {
      setError(language === 'tr' ? 'Bir hata oluştu' : 'An error occurred')
    } finally {
      setSharing(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  return (
    <>
      {/* Share Button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
      >
        <Share2 className="w-4 h-4" />
        {language === 'tr' ? "Sosyal'de Paylaş" : 'Share on Social'}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a0b2e] border border-purple-500/30 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-serif text-gold-400">
                  {language === 'tr' ? "Sosyal'de Paylaş" : 'Share on Social'}
                </h3>
                <button onClick={handleClose} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success State */}
              {shared ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-green-400 text-lg">
                    {language === 'tr' ? 'Başarıyla paylaşıldı!' : 'Shared successfully!'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Info */}
                  <p className="text-purple-300/70 text-sm mb-4">
                    {language === 'tr'
                      ? 'Fal yorumunuz sosyal akışta diğer kullanıcılarla paylaşılacak. İsterseniz metni düzenleyebilirsiniz.'
                      : 'Your fortune reading will be shared with other users in the social feed. You can edit the text if you want.'}
                  </p>

                  {/* Content Editor */}
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-48 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-white placeholder-purple-400/50 resize-none outline-none focus:ring-1 focus:ring-gold-500"
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center mt-2 mb-4">
                    <span className="text-xs text-purple-400/50">
                      {editedContent.length}/1000
                    </span>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="flex-1 py-2 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/10"
                    >
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={!editedContent.trim() || sharing}
                      className="flex-1 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sharing ? (
                        <div className="w-5 h-5 border-2 border-[#1a0b2e] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          {language === 'tr' ? 'Paylaş' : 'Share'}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
