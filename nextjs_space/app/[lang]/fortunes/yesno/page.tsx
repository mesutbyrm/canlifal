'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { HelpCircle, Sparkles } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import SocialShare from '@/components/social-share'

export default function YesNoOraclePage() {
  const { language, t } = useLanguage()
  const { data: session } = useSession() || {}
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      setError(language === 'tr' ? 'Lütfen bir soru yazın' : 'Please enter a question')
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/fortunes/yesno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), language }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get oracle answer')
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
            <HelpCircle className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'Evet/Hayır Falı' : 'Yes/No Oracle'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' ? 'Sorunuzu sorun, evren yanıtlayacak' : 'Ask your question, the universe will answer'}
          </p>
          <p className="text-gold-400 text-sm mt-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            2 {language === 'tr' ? 'cFc' : 'credits'}
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
                  {language === 'tr' ? 'Sorunuz' : 'Your Question'}
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={language === 'tr' ? 'Evet veya hayır ile yanıtlanabilecek bir soru sorun...' : 'Ask a question that can be answered with yes or no...'}
                  rows={4}
                  className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              <div className="text-center text-deep-purple-300 text-sm">
                <p>{language === 'tr' ? 'Örnek sorular:' : 'Example questions:'}</p>
                <p className="text-deep-purple-400 italic mt-1">
                  {language === 'tr' 
                    ? '"Bu iş teklifini kabul etmeli miyim?" • "Onunla mutlu olabilir miyim?"'
                    : '"Should I accept this job offer?" • "Can I be happy with them?"'}
                </p>
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
                    <HelpCircle className="w-5 h-5" />
                    {language === 'tr' ? 'Cevabı Al' : 'Get Answer'}
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
            <div className="text-center mb-6">
              <p className="text-deep-purple-300 text-sm mb-2">{language === 'tr' ? 'Sorunuz' : 'Your question'}</p>
              <p className="text-gold-500 font-serif text-xl italic">"{question}"</p>
            </div>
            <div className="prose prose-invert max-w-none text-center">
              <p className="text-deep-purple-100 leading-relaxed whitespace-pre-wrap text-lg">{response}</p>
            </div>
            
            <SocialShare 
              title={language === 'tr' ? 'Evet/Hayır Falı' : 'Yes/No Oracle'}
              text={response}
            />

            <button
              onClick={() => { setResponse(''); setQuestion(''); }}
              className="mt-6 w-full py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {language === 'tr' ? 'Başka Soru Sor' : 'Ask Another Question'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
