'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Heart, Sparkles } from 'lucide-react'
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

export default function LoveCompatibilityPage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const [yourSign, setYourSign] = useState('')
  const [partnerSign, setPartnerSign] = useState('')
  const [yourName, setYourName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!yourSign || !partnerSign) {
      setError(language === 'tr' ? 'Lütfen her iki burcu da seçin' : 'Please select both zodiac signs')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourSign, partnerSign, yourName, partnerName, language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get love reading')
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

  const yourSignData = ZODIAC_SIGNS.find(s => s.id === yourSign)
  const partnerSignData = ZODIAC_SIGNS.find(s => s.id === partnerSign)

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <Heart className="w-16 h-16 text-pink-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'Aşk Uyumu' : 'Love Compatibility'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'İki kalbin kozmik bağını keşfedin' : 'Discover the cosmic connection between two hearts'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            5 {language === 'tr' ? 'kredi' : 'credits'}
          </p>
        </motion.div>

        {!response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-mystical-card border border-mystical rounded-xl p-8"
          >
            <div className="grid md:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-gold-500 font-semibold mb-3 text-center">
                  {language === 'tr' ? 'Sizin Burcunuz' : 'Your Sign'}
                </h3>
                <input
                  type="text"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  placeholder={language === 'tr' ? 'İsminiz (isteğe bağlı)' : 'Your name (optional)'}
                  className="w-full mb-3 px-4 py-2 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  {ZODIAC_SIGNS.map((sign) => (
                    <button
                      key={`your-${sign.id}`}
                      onClick={() => setYourSign(sign.id)}
                      className={`p-2 rounded-lg border transition-all text-center ${
                        yourSign === sign.id
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-200 hover:border-pink-500/50'
                      }`}
                    >
                      <span className="text-lg block">{sign.emoji}</span>
                      <span className="text-xs">{language === 'tr' ? sign.tr : sign.en}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-gold-500 font-semibold mb-3 text-center">
                  {language === 'tr' ? 'Partnerinizin Burcu' : "Partner's Sign"}
                </h3>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder={language === 'tr' ? 'Partner ismi (isteğe bağlı)' : 'Partner name (optional)'}
                  className="w-full mb-3 px-4 py-2 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  {ZODIAC_SIGNS.map((sign) => (
                    <button
                      key={`partner-${sign.id}`}
                      onClick={() => setPartnerSign(sign.id)}
                      className={`p-2 rounded-lg border transition-all text-center ${
                        partnerSign === sign.id
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-200 hover:border-pink-500/50'
                      }`}
                    >
                      <span className="text-lg block">{sign.emoji}</span>
                      <span className="text-xs">{language === 'tr' ? sign.tr : sign.en}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || !yourSign || !partnerSign}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  {language === 'tr' ? 'Uyumu Keşfet' : 'Discover Compatibility'}
                </>
              )}
            </button>
          </motion.div>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-mystical-card border border-pink-500/30 rounded-xl p-8 mystical-shadow"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <span className="text-4xl block">{yourSignData?.emoji}</span>
                <span className="text-deep-purple-200 text-sm">
                  {yourName || (language === 'tr' ? yourSignData?.tr : yourSignData?.en)}
                </span>
              </div>
              <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
              <div className="text-center">
                <span className="text-4xl block">{partnerSignData?.emoji}</span>
                <span className="text-deep-purple-200 text-sm">
                  {partnerName || (language === 'tr' ? partnerSignData?.tr : partnerSignData?.en)}
                </span>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
            
            <SocialShare 
              title={language === 'tr' ? 'Aşk Uyumu Sonucu' : 'Love Compatibility Result'}
              text={response}
            />

            <button
              onClick={() => { setResponse(''); setYourSign(''); setPartnerSign(''); setYourName(''); setPartnerName(''); }}
              className="mt-6 w-full py-3 border border-pink-500/50 text-pink-400 hover:bg-pink-500/10 rounded-lg transition-all"
            >
              {language === 'tr' ? 'Yeni Uyum Bak' : 'Check Another Match'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
