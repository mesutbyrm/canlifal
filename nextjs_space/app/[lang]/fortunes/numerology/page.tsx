'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Hash, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'

export default function NumerologyPage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !birthDate) {
      setError(language === 'tr' ? 'Lütfen isim ve doğum tarihinizi girin' : 'Please enter your name and birth date')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), birthDate, language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get numerology reading')
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

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <Hash className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'Numeroloji' : 'Numerology'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'İsminiz ve doğum tarihiniz yazılı kaderinizi açığa çıkarır' : 'Your name and birth date reveal your written destiny'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            4 {language === 'tr' ? 'CFC' : 'CFC'}
          </p>
        </motion.div>

        {!response && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-mystical-card border border-mystical rounded-xl p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-deep-purple-200 mb-2">
                  {language === 'tr' ? 'Tam İsminiz' : 'Your Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'tr' ? 'İsminizi yazın...' : 'Enter your name...'}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-deep-purple-200 mb-2">
                  {language === 'tr' ? 'Doğum Tarihiniz' : 'Your Birth Date'}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Hash className="w-5 h-5" />
                    {language === 'tr' ? 'Sayılarımı Keşfet' : 'Discover My Numbers'}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-mystical-card border border-gold-500/30 rounded-xl p-8 mystical-shadow"
          >
            <div className="flex items-center gap-3 mb-6">
              <Hash className="w-10 h-10 text-gold-500" />
              <div>
                <h2 className="font-serif text-2xl text-gold-500">{name}</h2>
                <p className="text-deep-purple-300 text-sm">{birthDate}</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">{response}</p>
            </div>
            
            <SocialShare 
              title={language === 'tr' ? 'Numeroloji Analizi' : 'Numerology Analysis'}
              text={response}
            />

            <button
              onClick={() => { setResponse(''); setName(''); setBirthDate(''); }}
              className="mt-6 w-full py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {language === 'tr' ? 'Yeni Analiz Yap' : 'Get Another Reading'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
