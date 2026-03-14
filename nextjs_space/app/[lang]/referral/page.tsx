'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Users, Gift, Copy, Check, Trophy, Star, Sparkles, Share2 } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import Link from 'next/link'

interface ReferralData {
  referralCode: string
  referralLink: string
  totalReferrals: number
  totalCreditsEarned: number
  referrals: Array<{
    id: string
    name: string
    createdAt: string
  }>
  history: Array<{
    id: string
    creditsAwarded: number
    createdAt: string
    referred: { name: string }
  }>
  milestones: Array<{
    count: number
    reward: string
    rewardText: { tr: string; en: string }
    achieved: boolean
  }>
}

export default function ReferralPage() {
  const { language } = useLanguage()
  const { data: session, status } = useSession() || {}
  const [data, setData] = useState<ReferralData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/referral')
        .then(res => res.json())
        .then(setData)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [status])

  const copyLink = async () => {
    if (data?.referralLink) {
      await navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareLink = async () => {
    if (data?.referralLink && navigator.share) {
      try {
        await navigator.share({
          title: language === 'tr' ? 'FALCI - Davet' : 'FALCI - Invitation',
          text: language === 'tr' 
            ? 'Falcı\'ya katıl ve 50 ücretsiz cFc kazan!' 
            : 'Join Falcı and get 50 free credits!',
          url: data.referralLink
        })
      } catch (err) {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <LoadingSpinner message={language === 'tr' ? 'Yükleniyor...' : 'Loading...'} />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <div className="text-center">
          <Gift className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold-400 mb-4">
            {language === 'tr' ? 'Giriş Yapın' : 'Please Login'}
          </h1>
          <p className="text-deep-purple-200 mb-6">
            {language === 'tr' ? 'Referans sistemini kullanmak için giriş yapın.' : 'Login to use the referral system.'}
          </p>
          <Link href={`/${language}/login`} className="px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500">
            {language === 'tr' ? 'Giriş Yap' : 'Login'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Gift className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-3xl sm:text-4xl text-gold-400 mb-2">
            {language === 'tr' ? 'Davet Et & Kazan' : 'Invite & Earn'}
          </h1>
          <p className="text-deep-purple-200">
            {language === 'tr' 
              ? 'Arkadaşlarını davet et, her ikimiz de 50 cFc kazanalım!' 
              : 'Invite friends, both of us get 50 credits!'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-6 text-center"
          >
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-400">{data?.totalReferrals || 0}</p>
            <p className="text-deep-purple-300 text-sm">{language === 'tr' ? 'Davet Edilen' : 'Invited'}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-6 text-center"
          >
            <Sparkles className="w-8 h-8 text-gold-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gold-400">{data?.totalCreditsEarned || 0}</p>
            <p className="text-deep-purple-300 text-sm">{language === 'tr' ? 'Kazanılan cFc' : 'cFc Earned'}</p>
          </motion.div>
        </div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-6 mb-8"
        >
          <h2 className="font-serif text-xl text-gold-400 mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {language === 'tr' ? 'Davet Linkin' : 'Your Referral Link'}
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={data?.referralLink || ''}
              readOnly
              className="flex-1 px-4 py-3 bg-deep-purple-950 border border-deep-purple-700 rounded-lg text-deep-purple-200 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 sm:flex-none px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500 flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? (language === 'tr' ? 'Kopyalandı' : 'Copied') : (language === 'tr' ? 'Kopyala' : 'Copy')}
              </button>
              <button
                onClick={shareLink}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-deep-purple-400 text-sm mt-3">
            {language === 'tr' 
              ? `Referans Kodun: ${data?.referralCode || ''}` 
              : `Your Code: ${data?.referralCode || ''}`}
          </p>
        </motion.div>

        {/* Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-6 mb-8"
        >
          <h2 className="font-serif text-xl text-gold-400 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {language === 'tr' ? 'Kilometre Taşları' : 'Milestones'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data?.milestones?.map((milestone, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border text-center ${
                  milestone.achieved
                    ? 'bg-gold-600/20 border-gold-500/50'
                    : 'bg-deep-purple-950/50 border-deep-purple-700'
                }`}
              >
                <div className={`text-2xl font-bold ${milestone.achieved ? 'text-gold-400' : 'text-deep-purple-400'}`}>
                  {milestone.count}
                </div>
                <div className="text-xs text-deep-purple-300 mb-1">
                  {language === 'tr' ? 'davet' : 'invites'}
                </div>
                <div className={`text-sm font-medium ${milestone.achieved ? 'text-gold-300' : 'text-deep-purple-400'}`}>
                  {milestone.rewardText[language]}
                </div>
                {milestone.achieved && <Star className="w-4 h-4 text-gold-400 mx-auto mt-2" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Referrals */}
        {data?.referrals && data.referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-6"
          >
            <h2 className="font-serif text-xl text-gold-400 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {language === 'tr' ? 'Davet Ettiklerin' : 'Your Referrals'}
            </h2>
            <div className="space-y-3">
              {data.referrals.slice(0, 10).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-deep-purple-950/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center">
                      <span className="text-purple-300 font-medium">{ref.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-deep-purple-200">{ref.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gold-400 font-medium">+50</span>
                    <p className="text-deep-purple-400 text-xs">
                      {new Date(ref.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
