'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Eye, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'

const MOOD_OPTIONS = {
  en: ['Happy', 'Calm', 'Anxious', 'Sad', 'Excited', 'Tired', 'Confused', 'Peaceful'],
  tr: ['Mutlu', 'Sakin', 'Endişeli', 'Üzgün', 'Heyecanlı', 'Yorgun', 'Kafası Karışık', 'Huzurlu']
}

export default function AuraReadingPage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [currentMood, setCurrentMood] = useState('')
  const [recentExperiences, setRecentExperiences] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const moods = language === 'tr' ? MOOD_OPTIONS.tr : MOOD_OPTIONS.en

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(language === 'tr' ? 'İsminizi girin' : 'Please enter your name')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/aura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), birthDate, currentMood, recentExperiences: recentExperiences.trim(), language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get aura reading')
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Eye className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'Aura Okuma' : 'Aura Reading'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'Enerji alanınızın renklerini keşfedin' : 'Discover the colors of your energy field'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />6 {language === 'tr' ? 'cFc' : 'credits'}
          </p>
        </motion.div>

        {!response && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-mystical-card border border-mystical rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-deep-purple-200 mb-2">{language === 'tr' ? 'İsminiz *' : 'Your Name *'}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'tr' ? 'İsminizi yazın' : 'Enter your name'}
                    className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-deep-purple-200 mb-2">{language === 'tr' ? 'Doğum Tarihi (İsteğe Bağlı)' : 'Birth Date (Optional)'}</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-deep-purple-200 mb-2">{language === 'tr' ? 'Mevcut Ruh Haliniz' : 'Current Mood'}</label>
                <div className="flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setCurrentMood(mood)}
                      className={`px-4 py-2 rounded-lg border transition-all text-sm ${currentMood === mood ? 'bg-gold-500/20 border-gold-500 text-gold-500' : 'bg-deep-purple-900/50 border-deep-purple-700 text-deep-purple-300 hover:border-gold-500/50'}`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-deep-purple-200 mb-2">{language === 'tr' ? 'Son Deneyimler (İsteğe Bağlı)' : 'Recent Experiences (Optional)'}</label>
                <textarea
                  value={recentExperiences}
                  onChange={(e) => setRecentExperiences(e.target.value)}
                  placeholder={language === 'tr' ? 'Son zamanlarda yaşadığınız önemli olayları kısaca anlatın...' : 'Briefly describe any significant recent experiences...'}
                  rows={3}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-deep-purple-950 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <LoadingSpinner /> : <><Eye className="w-5 h-5" />{language === 'tr' ? 'Auramı Oku' : 'Read My Aura'}</>}
              </button>
            </form>
          </motion.div>
        )}

        {response && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-mystical-card border border-gold-500/30 rounded-xl p-8 mystical-shadow">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-10 h-10 text-gold-500" />
              <div>
                <h2 className="font-serif text-2xl text-gold-500">{language === 'tr' ? 'Aura Okumanız' : 'Your Aura Reading'}</h2>
                <p className="text-deep-purple-300 text-sm">{name}</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none"><p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap">{response}</p></div>
            <SocialShare title={language === 'tr' ? 'Aura Okumam' : 'My Aura Reading'} text={response} />
            <button onClick={() => { setResponse(''); setName(''); setBirthDate(''); setCurrentMood(''); setRecentExperiences(''); }} className="mt-6 w-full py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all">
              {language === 'tr' ? 'Yeni Okuma Yap' : 'Get New Reading'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
