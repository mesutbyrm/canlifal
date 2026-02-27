'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Mail, User, MessageSquare, Send, Sparkles, CheckCircle } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

export default function ContactPage() {
  const { language, t } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSuccess(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-mystical-card border border-green-500/30 rounded-xl p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-serif text-2xl text-gold-500 mb-4">
              {language === 'tr' ? 'Mesajınız Gönderildi!' : 'Message Sent!'}
            </h2>
            <p className="text-deep-purple-200 mb-6">
              {language === 'tr' 
                ? 'En kısa sürede size dönüş yapacağız.' 
                : 'We will get back to you as soon as possible.'}
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-3 border border-gold-500/50 text-gold-500 hover:bg-gold-500/10 rounded-lg transition-all"
            >
              {language === 'tr' ? 'Yeni Mesaj Gönder' : 'Send Another Message'}
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <Mail className="w-16 h-16 text-gold-500" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-gold-500 gold-glow mb-4">
            {language === 'tr' ? 'İletişim' : 'Contact Us'}
          </h1>
          <p className="text-deep-purple-200 text-lg">
            {language === 'tr' 
              ? 'Sorularınız için bize ulaşın' 
              : 'Reach out to us with your questions'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-mystical-card border border-mystical rounded-xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-deep-purple-200 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {language === 'tr' ? 'İsminiz' : 'Your Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:border-gold-500 focus:outline-none transition-colors"
                placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'John Doe'}
              />
            </div>

            <div>
              <label className="block text-deep-purple-200 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {language === 'tr' ? 'E-posta' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:border-gold-500 focus:outline-none transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-deep-purple-200 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {language === 'tr' ? 'Mesajınız' : 'Your Message'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-white placeholder-deep-purple-400 focus:border-gold-500 focus:outline-none transition-colors resize-none"
                placeholder={language === 'tr' ? 'Mesajınızı buraya yazın...' : 'Write your message here...'}
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
                  <Send className="w-5 h-5" />
                  {language === 'tr' ? 'Gönder' : 'Send Message'}
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
