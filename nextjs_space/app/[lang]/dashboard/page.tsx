'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Coffee, Star, Moon, Sparkles, Calendar, Droplets, Video, Clock, User, ChevronRight } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format } from 'date-fns'
import WatchAdCredits from '@/components/watch-ad-credits'
import Link from 'next/link'

interface Fortune {
  id: string
  fortuneType: string
  aiResponse: string
  createdAt: string
  language: string
}

interface ActiveSession {
  id: string
  fortuneType: string
  status: string
  createdAt: string
  teller: {
    id: string
    displayName: string
    avatar: string | null
  }
}

export default function DashboardPage() {
  const { language, t } = useLanguage()
  const [fortunes, setFortunes] = useState<Fortune[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFortune, setSelectedFortune] = useState<Fortune | null>(null)

  useEffect(() => {
    fetchFortunes()
    fetchActiveSessions()
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

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/user/active-sessions')
      const data = await response.json()
      if (Array.isArray(data)) {
        setActiveSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch active sessions:', error)
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
    <div className="min-h-screen py-20 px-4 bg-[#0a0118]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Panelim' : 'My Dashboard'}
          </h1>
          <p className="text-purple-300">
            {language === 'tr' ? 'Fallarınız ve hesap bilgileriniz' : 'Your fortunes and account info'}
          </p>
          
          {/* Watch Ad for Credits */}
          <div className="flex justify-center mt-6">
            <WatchAdCredits />
          </div>
        </motion.div>

        {/* Active Live Sessions Banner */}
        {activeSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-gold-600/20 to-purple-600/20 border border-gold-500/50 rounded-xl p-6">
              <h2 className="text-xl font-bold text-gold-500 mb-4 flex items-center gap-2">
                <Video className="w-6 h-6 animate-pulse" />
                {language === 'tr' ? 'Aktif Canlı Seanslarınız' : 'Your Active Live Sessions'}
              </h2>
              <div className="space-y-3">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="bg-deep-purple-900/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center">
                        {sess.teller.avatar ? (
                          <img
                            src={sess.teller.avatar}
                            alt={sess.teller.displayName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{sess.teller.displayName}</p>
                        <p className="text-sm text-purple-300 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {language === 'tr' ? 'Seans aktif' : 'Session active'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/${language}/live-room/${sess.id}`}
                      className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-black font-bold rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Video className="w-5 h-5" />
                      {language === 'tr' ? 'Odaya Gir' : 'Enter Room'}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* My Fortunes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-gold-400 flex items-center gap-2">
            <Star className="w-5 h-5" />
            {language === 'tr' ? 'Fallarım' : 'My Fortunes'}
          </h2>
        </motion.div>

        {isLoading ? (
          <LoadingSpinner message={language === 'tr' ? 'Fallar yükleniyor...' : 'Loading fortunes...'} />
        ) : fortunes?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-purple-900/20 rounded-2xl border border-purple-700/30">
            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <p className="text-purple-300 text-lg mb-4">
              {language === 'tr' ? 'Henüz falınız yok' : 'No fortunes yet'}
            </p>
            <Link
              href={`/${language}/fortunes`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-lg transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              {language === 'tr' ? 'Fal Baktır' : 'Get Your Fortune'}
            </Link>
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
                <div className="bg-purple-900/30 border border-purple-700/50 rounded-2xl p-5 hover:border-gold-500/50 transition-all duration-300 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                      {getFortuneIcon(fortune?.fortuneType)}
                    </div>
                    <h3 className="font-semibold text-lg text-white group-hover:text-gold-400 transition-colors">
                      {t(`fortune.${fortune?.fortuneType}.name`)}
                    </h3>
                  </div>

                  <p className="text-purple-300 text-sm line-clamp-3 mb-4">
                    {fortune?.aiResponse}
                  </p>

                  <div className="flex items-center gap-2 text-purple-400 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(fortune?.createdAt), 'dd MMM yyyy')}</span>
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
