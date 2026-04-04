'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Star, Sparkles, AlertCircle, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import TextToSpeech from '@/components/text-to-speech'
import ShareToSocial from '@/components/share-to-social'
import InstagramShare from '@/components/instagram-share'
import FortunePageLayout from '@/components/fortune-page-layout'
import FortuneAccessGate from '@/components/fortune-access-gate'
import RelatedContentLinks from '@/components/related-content-links'

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
  const [adWatched, setAdWatched] = useState(false)
  const [formattedDate, setFormattedDate] = useState('')

  useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
  }, [language])

  const handleSubmit = async () => {
    if (!selectedSign) {
      setError('Lütfen burcunuzu seçin')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/burc-yorumu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zodiacSign: selectedSign, language, adWatched }),
      })

      if (!res.ok) {
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const errorData = await res.json()
          throw new Error(errorData.error || 'Burç yorumu alınamadı')
        }
        throw new Error('Burç yorumu alınamadı. Lütfen tekrar deneyin.')
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

  const resetForm = () => {
    setResponse('')
    setSelectedSign('')
  }

  return (
    <FortunePageLayout
      title="Günlük Burç Yorumu"
      titleEn="Daily Horoscope"
      subtitle="Burcunuzu seçin ve bugünün mesajını alın"
      subtitleEn="Select your sign and receive today's message"
      icon={Star}
      cost={3}
    >
      {!response ? (
        <div className="space-y-5">
          {/* Zodiac Sign Selection */}
          <div>
            <label className="block text-deep-purple-200 mb-3 text-sm font-medium">
              {'Burcunuzu Seçin'}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {ZODIAC_SIGNS.map((sign) => (
                <button
                  key={sign.id}
                  onClick={() => setSelectedSign(sign.id)}
                  className={`p-2 sm:p-3 rounded-xl transition-all text-center ${
                    selectedSign === sign.id
                      ? 'bg-gold-500 text-deep-purple-950'
                      : 'bg-deep-purple-900/50 border border-deep-purple-700 text-deep-purple-200 hover:border-gold-500/50'
                  }`}
                >
                  <span className="text-xl sm:text-2xl block mb-0.5">{sign.emoji}</span>
                  <span className="text-[10px] sm:text-xs">{sign.tr}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Today's Date */}
          {formattedDate && (
            <div className="text-center text-deep-purple-300 text-sm">
              📅 {formattedDate}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedSign}
            className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isLoading ? (
              <LoadingSpinner message={'Burç yorumunuz hazırlanıyor...'} />
            ) : (
              <>
                <Star className="w-5 h-5" />
                {'Burcumu Göster'}
              </>
            )}
          </button>
        </div>
      ) : (
        /* Fortune Result */
        <div className="space-y-5">
          {/* Header with Sign */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gold-500/20 border border-gold-500/50 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl sm:text-4xl">{selectedSignData?.emoji}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 text-gold-500">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-serif text-xl sm:text-2xl">
                  {selectedSignData?.tr}
                </h2>
              </div>
              <p className="text-deep-purple-300 text-sm mt-1">
                {formattedDate}
              </p>
            </div>
          </div>
          
          {/* Fortune Content */}
          <div className="bg-deep-purple-900/30 rounded-xl p-4 sm:p-5 border border-deep-purple-700/30">
            <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {response}
            </p>
          </div>
          
          {/* Text to Speech */}
          <TextToSpeech text={response} />
          
          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2">
            <InstagramShare sharerName={(session as any)?.user?.name || 'Misafir'} resultMessage={response} fortuneType="horoscope" />
            <ShareToSocial fortuneType="horoscope" content={response} />
            <SocialShare 
              title={`Günlük ${selectedSignData?.tr} Burcu`}
              text={response}
            />
          </div>
          
          {/* New Fortune Button */}
          <button
            onClick={resetForm}
            className="w-full py-3 sm:py-4 bg-deep-purple-800 hover:bg-deep-purple-700 text-gold-400 rounded-xl transition-all font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCcw className="w-4 h-4" />
            {'Yeni Burç Bak'}
          </button>
        </div>
      )}

        <RelatedContentLinks
          currentSlug="burc-yorumu"
          relatedSlugs={['ask-uyumu', 'dogum-haritasi', 'numeroloji', 'tarot-fali', 'kahve-fali']}
          introText="Günlük burç yorumunuzun yanı sıra aşk uyumunuzu, doğum haritanızı ve numeroloji analizinizi de keşfedebilirsiniz."
        />
    </FortunePageLayout>
  )
}
