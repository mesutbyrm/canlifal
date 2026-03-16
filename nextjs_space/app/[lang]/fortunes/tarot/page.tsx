'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { Star, Sparkles, AlertCircle, RotateCcw } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'
import TextToSpeech from '@/components/text-to-speech'
import ShareToSocial from '@/components/share-to-social'
import FortunePageLayout from '@/components/fortune-page-layout'

export default function TarotFortunePage() {
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  const router = useRouter()
  const [question, setQuestion] = useState('')
  const [cardCount, setCardCount] = useState(3)
  const [fortune, setFortune] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFortune('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/fortunes/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, cardCount, language }),
      })

      if (!response?.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Failed to generate fortune')
      }

      const reader = response?.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = (await reader?.read()) ?? { done: true, value: undefined }
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed?.choices?.[0]?.delta?.content || ''
              if (content) {
                fullText += content
                setFortune(fullText)
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('message.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFortune('')
    setQuestion('')
    router.refresh()
  }

  return (
    <FortunePageLayout
      title="Tarot Falı"
      titleEn="Tarot Reading"
      subtitle="Kartların sırrını keşfedin"
      subtitleEn="Discover the secrets of the cards"
      icon={Star}
      cost={7}
    >
      {!fortune ? (
        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Question */}
          <div>
            <label className="text-deep-purple-200 text-sm font-medium block mb-2">
              {language === 'tr' ? 'Sorunuz nedir?' : 'What is your question?'}
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e?.target?.value ?? '')}
              className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-xl text-deep-purple-100 placeholder-deep-purple-500 focus:outline-none focus:border-gold-500/50 transition-colors min-h-[100px] sm:min-h-[120px] text-sm sm:text-base resize-none"
              placeholder={language === 'tr' ? 'Kartlara sormak istediğiniz soruyu yazın...' : 'Write the question you want to ask the cards...'}
              required
            />
          </div>

          {/* Card Count Selection */}
          <div>
            <label className="text-deep-purple-200 text-sm font-medium block mb-3">
              {language === 'tr' ? 'Kaç kart çekilsin?' : 'How many cards?'}
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 3, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCardCount(count)}
                  className={`py-3 sm:py-4 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                    cardCount === count
                      ? 'bg-gold-500 text-deep-purple-950'
                      : 'bg-deep-purple-900/50 border border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'
                  }`}
                >
                  <span className="text-lg sm:text-xl">{'\u2605'.repeat(Math.min(count, 3))}</span>
                  <span className="text-sm">{count} {language === 'tr' ? 'Kart' : count === 1 ? 'Card' : 'Cards'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-deep-purple-900/30 border border-deep-purple-700/50 rounded-xl p-3 sm:p-4">
            <p className="text-deep-purple-300 text-xs sm:text-sm">
              🌟 {language === 'tr' 
                ? 'Sorunuzu açık ve net bir şekilde ifade edin. Tek bir konuya odaklanın.' 
                : 'Express your question clearly. Focus on a single topic.'}
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isLoading ? (
              <LoadingSpinner message={language === 'tr' ? 'Kartlar açılıyor...' : 'Drawing cards...'} />
            ) : (
              <>
                <Star className="w-5 h-5" />
                {language === 'tr' ? 'Kartları Çek' : 'Draw Cards'}
              </>
            )}
          </button>
        </form>
      ) : (
        /* Fortune Result */
        <div className="space-y-5">
          {/* Success Header */}
          <div className="flex items-center gap-2 text-gold-500">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-serif text-xl sm:text-2xl">
              {language === 'tr' ? 'Tarot Okumanız Hazır' : 'Your Tarot Reading is Ready'}
            </h2>
          </div>
          
          {/* Fortune Content */}
          <div className="bg-deep-purple-900/30 rounded-xl p-4 sm:p-5 border border-deep-purple-700/30">
            <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
              {fortune}
            </p>
          </div>
          
          {/* Text to Speech */}
          <TextToSpeech text={fortune} />
          
          {/* Share Buttons */}
          <div className="flex flex-wrap gap-2">
            <ShareToSocial fortuneType="tarot" content={fortune} />
            <SocialShare 
              title={language === 'tr' ? 'Tarot Okumam' : 'My Tarot Reading'} 
              text={fortune} 
            />
          </div>
          
          {/* New Fortune Button */}
          <button
            onClick={resetForm}
            className="w-full py-3 sm:py-4 bg-deep-purple-800 hover:bg-deep-purple-700 text-gold-400 rounded-xl transition-all font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <RotateCcw className="w-4 h-4" />
            {language === 'tr' ? 'Yeni Okuma Yap' : 'New Reading'}
          </button>
        </div>
      )}
    </FortunePageLayout>
  )
}
