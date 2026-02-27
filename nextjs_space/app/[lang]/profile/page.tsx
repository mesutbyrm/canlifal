'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/lib/language-context'
import { User, Mail, Sparkles, Calendar, Globe } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { data: session } = useSession() || {}
  const { language, t } = useLanguage()

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl text-gold-500 gold-glow mb-4">
            {t('profile.title')}
          </h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-mystical-card border border-mystical rounded-lg p-8 mystical-shadow"
        >
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-gold-600 to-gold-800 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-deep-purple-950" />
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-deep-purple-900/30 rounded-lg border border-deep-purple-800">
                <User className="w-5 h-5 text-gold-500" />
                <div>
                  <p className="text-deep-purple-400 text-sm">{t('form.name')}</p>
                  <p className="text-deep-purple-100 font-medium">{session?.user?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-deep-purple-900/30 rounded-lg border border-deep-purple-800">
                <Mail className="w-5 h-5 text-gold-500" />
                <div>
                  <p className="text-deep-purple-400 text-sm">{t('form.email')}</p>
                  <p className="text-deep-purple-100 font-medium">{session?.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-deep-purple-900/30 rounded-lg border border-deep-purple-800">
                <Sparkles className="w-5 h-5 text-gold-500" />
                <div>
                  <p className="text-deep-purple-400 text-sm">{t('profile.balance')}</p>
                  <p className="text-gold-400 font-semibold text-xl">{session?.user?.credits ?? 0} {t('nav.credits')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-deep-purple-900/30 rounded-lg border border-deep-purple-800">
                <Globe className="w-5 h-5 text-gold-500" />
                <div>
                  <p className="text-deep-purple-400 text-sm">{t('form.language')}</p>
                  <p className="text-deep-purple-100 font-medium uppercase">{session?.user?.preferredLanguage || language}</p>
                </div>
              </div>
            </div>

            {/* Need Credits Message */}
            {(session?.user?.credits ?? 0) < 5 && (
              <div className="mt-6 p-4 bg-gold-600/10 border border-gold-600/30 rounded-lg">
                <p className="text-gold-400 text-sm text-center">
                  {language === 'tr' 
                    ? 'Krediniz az. Daha fazla kredi için yönetici ile iletişime geçin.'
                    : 'Low on credits. Contact admin for more credits.'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
