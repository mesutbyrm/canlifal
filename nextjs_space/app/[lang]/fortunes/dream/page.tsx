'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { useRouter } from 'next/navigation'
import { Moon, Sparkles, AlertCircle } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import Image from 'next/image'

export default function DreamFortunePage() {
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()
  const router = useRouter()
  const [dreamDescription, setDreamDescription] = useState('')
  const [fortune, setFortune] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFortune('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/fortunes/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamDescription, language }),
      })

      if (!response?.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.error || 'Failed to generate fortune')
      }

      // Handle streaming response
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
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || t('message.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-deep-purple-975 to-[#0a0118]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <Moon className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {t('dream.title')}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {t('dream.prompt')}
          </p>
        </motion.div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative aspect-video rounded-lg overflow-hidden mystical-shadow">
            <Image
              src="/dream_interpretation_icon.jpg"
              alt="Dream Interpretation"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-mystical-card border border-mystical rounded-lg p-8 mystical-shadow"
        >
          {!fortune ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-deep-purple-200 text-sm font-medium flex items-center justify-between">
                  {t('dream.prompt')}
                  <span className="flex items-center gap-1 text-gold-500">
                    <Sparkles className="w-4 h-4" />
                    5 {t('nav.credits')}
                  </span>
                </label>
                <textarea
                  value={dreamDescription}
                  onChange={(e) => setDreamDescription(e?.target?.value ?? '')}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 placeholder-deep-purple-400 focus:outline-none focus:border-gold-600 transition-colors min-h-[150px]"
                  placeholder={t('dream.placeholder')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !dreamDescription.trim()}
                className="w-full py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mystical-shadow"
              >
                {isLoading ? (
                  <LoadingSpinner message={language === 'tr' ? 'Rüyanız yorumlanıyor...' : 'Interpreting your dream...'} />
                ) : (
                  language === 'tr' ? 'Rüyamı Yorumla' : 'Interpret My Dream'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-gold-500 mb-4">
                <Sparkles className="w-5 h-5" />
                <h2 className="font-serif text-2xl">{t('message.fortune_generated')}</h2>
              </div>
              <div className="prose prose-invert max-w-none">
                <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">
                  {fortune}
                </p>
              </div>
              <button
                onClick={() => {
                  setFortune('')
                  setDreamDescription('')
                  router.refresh()
                }}
                className="w-full py-3 bg-deep-purple-800 text-gold-400 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
              >
                {language === 'tr' ? 'Yeni Rüya Yorumla' : 'Interpret Another Dream'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
