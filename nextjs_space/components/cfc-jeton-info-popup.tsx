'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, Sparkles, Radio } from 'lucide-react'
import CfcCoin from './cfc-coin'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'

interface CfcJetonInfoPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function CfcJetonInfoPopup({ isOpen, onClose }: CfcJetonInfoPopupProps) {
  const { language } = useLanguage()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-gradient-to-br from-[#1a0a2e] via-[#16082b] to-[#0d0520] rounded-2xl border border-purple-500/30 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-900/50 to-fuchsia-900/50 px-6 py-4 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <Info className="w-6 h-6 text-purple-300" />
                <h3 className="text-lg font-bold text-white">
                  {'Para Birimi Bilgisi'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              
              {/* CFC Section */}
              <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <CfcCoin size={36} />
                  <div>
                    <h4 className="text-gold-400 font-bold text-base">
                      Jeton <span className="text-gold-400/70 text-sm font-normal">(Site Jetonu)</span>
                    </h4>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">
                      {'Fal baktırma, sohbet, sosyal özellikler için kullanılır'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-gold-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">
                      {'Günlük bonuslar, reklam ödülleri ve davet bonusları ile kazanılır'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 flex-shrink-0 text-xs">❌</span>
                    <span className="text-red-300 font-medium">
                      {'Canlı yayınlarda ve canlı falcı seanslarında KULLANILAMAZ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Jeton Section */}
              <div className="bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🪙</span>
                  <div>
                    <h4 className="text-purple-300 font-bold text-base">
                      Jeton
                    </h4>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">
                      {'Canlı yayın hediyeleri, canlı falcı seansları için kullanılır'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">
                      {'Kullanıcılar arası hediye gönderimi için kullanılır'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Radio className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">
                      {'Gerçek para ile satın alınır — her yerde geçerlidir'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5 flex-shrink-0 text-xs">✅</span>
                    <span className="text-green-300 font-medium">
                      {'Her yerde kullanılabilir, sınırlama yoktur'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-purple-500/20 flex gap-3">
              <Link
                href={`/jeton`}
                className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white py-2.5 rounded-xl text-center font-medium text-sm transition-all"
              >
                🪙 {'Jeton Satın Al'}
              </Link>
              <button
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                {'Anladım'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
