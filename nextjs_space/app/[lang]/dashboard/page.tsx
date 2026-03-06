'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Coffee, Star, Moon, Sparkles, Calendar, Droplets } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format } from 'date-fns'
import WatchAdCredits from '@/components/watch-ad-credits'

interface Fortune {
  id: string
  fortuneType: string
  aiResponse: string
  createdAt: string
  language: string
}

export default function DashboardPage() {
  const { language, t } = useLanguage()
  const [fortunes, setFortunes] = useState<Fortune[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFortune, setSelectedFortune] = useState<Fortune | null>(null)

  useEffect(() => {
    fetchFortunes()
  }, [])

  const fetchFortunes = async () => {
    try {
      const response = await fetch('/api/user/fortunes')
      const data = await response.json()
      setFortunes(data?.fortunes || [])
    } catch (error) {
      console.error('Failed to fetch fortunes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFortuneIcon = (type: string) => {
    switch (type) {
      case 'coffee':
        return <Coffee className="w-6 h-6" />
      case 'tarot':
        return <Star className="w-6 h-6" />
      case 'dream':
        return <Moon className="w-6 h-6" />
      case 'kursundokme':
        return <Droplets className="w-6 h-6" />
      default:
        return <Sparkles className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-6xl text-gold-500 gold-glow mb-4">
            {t('dashboard.title')}
          </h1>
          
          {/* Watch Ad for Credits */}
          <div className="flex justify-center mt-6">
            <WatchAdCredits />
          </div>
        </motion.div>

        {isLoading ? (
          <LoadingSpinner message={language === 'tr' ? 'Fallar yükleniyor...' : 'Loading fortunes...'} />
        ) : fortunes?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20">
            <Sparkles className="w-16 h-16 text-gold-500 mx-auto mb-4" />
            <p className="text-deep-purple-200 text-lg">
              {t('dashboard.no_fortunes')}
            </p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fortunes?.map((fortune, index) => (
              <motion.div
                key={fortune?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => setSelectedFortune(fortune)}
                className="group cursor-pointer"
              >
                <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow hover:shadow-2xl transition-all duration-300 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-gold-500">
                      {getFortuneIcon(fortune?.fortuneType)}
                    </div>
                    <h3 className="font-serif text-xl text-gold-400 group-hover:text-gold-300 transition-colors">
                      {t(`fortune.${fortune?.fortuneType}.name`)}
                    </h3>
                  </div>

                  <p className="text-deep-purple-200 text-sm line-clamp-3 mb-4">
                    {fortune?.aiResponse}
                  </p>

                  <div className="flex items-center gap-2 text-deep-purple-400 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(fortune?.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Fortune Detail Modal */}
        {selectedFortune && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedFortune(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-mystical-card border border-mystical rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto mystical-shadow"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-gold-500">
                  {getFortuneIcon(selectedFortune?.fortuneType)}
                </div>
                <h2 className="font-serif text-2xl text-gold-400">
                  {t(`fortune.${selectedFortune?.fortuneType}.name`)}
                </h2>
              </div>

              <div className="prose prose-invert max-w-none mb-6">
                <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">
                  {selectedFortune?.aiResponse}
                </p>
              </div>

              <div className="flex items-center gap-2 text-deep-purple-400 text-sm mb-6">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(selectedFortune?.createdAt), 'MMMM dd, yyyy')}</span>
              </div>

              <button
                onClick={() => setSelectedFortune(null)}
                className="w-full py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
