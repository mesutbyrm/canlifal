'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Star, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'

const ZODIAC_SIGNS = [
  { id: 'aries', emoji: '♈', en: 'Aries', tr: 'Koç' },
  { id: 'taurus', emoji: '♉', en: 'Taurus', tr: 'Boğa' },
  { id: 'gemini', emoji: '♊', en: 'Gemini', tr: 'İkizler' },
  { id: 'cancer', emoji: '♋', en: 'Cancer', tr: 'Yengeç' },
  { id: 'leo', emoji: '♌', en: 'Leo', tr: 'Aslan' },
  { id: 'virgo', emoji: '♍', en: 'Virgo', tr: 'Başak' },
  { id: 'libra', emoji: '♎', en: 'Libra', tr: 'Terazi' },
  { id: 'scorpio', emoji: '♏', en: 'Scorpio', tr: 'Akrep' },
  { id: 'sagittarius', emoji: '♐', en: 'Sagittarius', tr: 'Yay' },
  { id: 'capricorn', emoji: '♑', en: 'Capricorn', tr: 'Oğlak' },
  { id: 'aquarius', emoji: '♒', en: 'Aquarius', tr: 'Kova' },
  { id: 'pisces', emoji: '♓', en: 'Pisces', tr: 'Balık' },
]

export default function HoroscopePage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const [selectedSign, setSelectedSign] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
  }, [language])

  const handleSubmit = async () => {
    if (!selectedSign) {
      setError(language === 'tr' ? 'Lütfen burcunuzu seçin' : 'Please select your zodiac sign')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zodiacSign: selectedSign, language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get horoscope')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed?.choices?.[0]?.delta?.content || ''
              if (content) setResponse(prev => prev + content)
            } catch (e) {}
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedSignData = ZODIAC_SIGNS.find(s => s.id === selectedSign)

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <Star className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {t('fortune.horoscope.name') || (language === 'tr' ? 'Günlük Burç' : 'Daily Horoscope')}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'Burcunuzu seçin ve bugünün mesajını alın' : 'Select your sign and receive today\'s message'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            3 {t('credits') || 'credits'}
          </p>
        </motion.div>

        {!response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-mystical-card border border-mystical rounded-xl p-8"
          >
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {ZODIAC_SIGNS.map((sign) => (
                <button
                  key={sign.id}
                  onClick={() => setSelectedSign(sign.id)}
                  className={`p-4 rounded-lg border transition-all text-center ${
                    selectedSign === sign.id
                      ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                      : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-200 hover:border-gold-500/50'
                  }`}
                >
                  <span className="text-2xl block mb-1">{sign.emoji}</span>
                  <span className="text-sm">{language === 'tr' ? sign.tr : sign.en}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedSign}
              className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Star className="w-5 h-5" />
                  {language === 'tr' ? 'Burcumu Göster' : 'Show My Horoscope'}
                </>
              )}
            </button>
          </motion.div>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-mystical-card border border-gold-500/30 rounded-xl p-8 mystical-shadow"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">{selectedSignData?.emoji}</span>
              <div>
                <h2 className="font-serif text-2xl text-gold-500">
                  {language === 'tr' ? selectedSignData?.tr : selectedSignData?.en}
                </h2>
                <p className="text-deep-purple-300 text-sm">
                  {formattedDate}
                </p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
            
            <SocialShare 
              title={language === 'tr' ? `Günlük ${selectedSignData?.tr} Burcu` : `Daily ${selectedSignData?.en} Horoscope`}
              text={response}
            />

            <button
              onClick={() => { setResponse(''); setSelectedSign(''); }}
              className="mt-6 w-full py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {language === 'tr' ? 'Yeni Burç Bak' : 'Get Another Horoscope'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
