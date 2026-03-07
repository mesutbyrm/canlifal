'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { useSession } from 'next-auth/react'
import { Sparkles, Star, Moon, MessageCircle, Users, Share2, Heart, Coffee, Scroll, Eye, Activity } from 'lucide-react'
import FortuneCard from '@/components/fortune-card'
import { useEffect, useState } from 'react'

interface PublicStats {
  fortunes: {
    total: number
    byType: Record<string, number>
  }
  chat: {
    rooms: Array<{
      id: string
      slug: string
      nameEn: string
      nameTr: string
      icon: string
      onlineCount: number
    }>
    totalOnline: number
  }
  social: {
    totalPosts: number
    activeUsers: number
  }
  users: {
    total: number
  }
}

const FORTUNE_NAMES: Record<string, { tr: string; en: string; icon: string }> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Reading', icon: '☕' },
  tarot: { tr: 'Tarot', en: 'Tarot', icon: '🎴' },
  dream: { tr: 'Rüya Tabiri', en: 'Dream', icon: '🌙' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope', icon: '⭐' },
  palm: { tr: 'El Falı', en: 'Palm Reading', icon: '✋' },
  numerology: { tr: 'Numeroloji', en: 'Numerology', icon: '🔢' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards', icon: '👼' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis', icon: '✨' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart', icon: '🌟' },
  istikhara: { tr: 'İstihare', en: 'Istikhara', icon: '🤲' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune', icon: '❤️' },
  yesno: { tr: 'Evet/Hayır', en: 'Yes/No', icon: '❓' },
  katina: { tr: 'Katina Falı', en: 'Katina', icon: '🃏' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring', icon: '🫠' },
}

export default function HomePage() {
  const { language } = useLanguage()
  const { data: session } = useSession() || {}
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    fetch('/api/public-stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-16">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_background.jpg"
            alt="Hero Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep-purple-950/80 via-deep-purple-950/60 to-[#0a0118]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <div className="flex flex-col items-center mb-4 sm:mb-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-gold-500" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-gold-400 gold-glow tracking-wider mt-2"
              >
                FALCI
              </motion.span>
            </div>
            
            {/* Neyse Halin Çıksın Falın - Decorative text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl text-deep-purple-200 italic tracking-wide"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {language === 'tr' ? 'Neyse Halin, Çıksın Falın' : 'Whatever Your State, Let Fortune Await'}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link
              href={session?.user ? `/${language}/fortunes` : `/${language}/register`}
              className="inline-block px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-[#1a0b2e] rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all duration-300 font-serif font-bold text-xl sm:text-2xl md:text-3xl shadow-lg hover:shadow-2xl tracking-wider border-2 border-gold-400"
            >
              {language === 'tr' ? 'FAL BAK' : 'GET FORTUNE'}
            </Link>
          </motion.div>
        </div>

        {/* Floating Decorations - responsive positioning */}
        <motion.div
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-24 sm:top-20 left-4 sm:left-10 opacity-20 sm:opacity-30"
        >
          <Star className="w-8 h-8 sm:w-12 sm:h-12 text-gold-400" />
        </motion.div>
        <motion.div
          animate={{ y: [20, -20, 20] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-16 sm:bottom-20 right-4 sm:right-10 opacity-20 sm:opacity-30"
        >
          <Moon className="w-10 h-10 sm:w-16 sm:h-16 text-gold-400" />
        </motion.div>
      </section>

      {/* Fortune Types Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-[#0a0118]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gold-500 gold-glow mb-3 sm:mb-4">
              {language === 'tr' ? 'Mistik Yolunuzu Seçin' : 'Choose Your Mystical Path'}
            </h2>
            <p className="text-deep-purple-200 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              {language === 'tr' 
                ? 'Her fal türü, geleceğinizin farklı yönlerini açığa çıkarır'
                : 'Each fortune type reveals different aspects of your future'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <FortuneCard
              type="coffee"
              imageSrc="/coffee_fortune_icon.jpg"
              cost={5}
            />
            <FortuneCard
              type="tarot"
              imageSrc="/tarot_reading_icon.jpg"
              cost={7}
            />
            <FortuneCard
              type="dream"
              imageSrc="/dream_interpretation_icon.jpg"
              cost={5}
            />
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-10 sm:py-12 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-gold-500 gold-glow mb-2">
              {language === 'tr' ? '📊 Canlı İstatistikler' : '📊 Live Statistics'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {/* Total Users */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4 text-center"
            >
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">{stats?.users?.total ?? 0}</p>
              <p className="text-deep-purple-300 text-xs sm:text-sm">{language === 'tr' ? 'Üye' : 'Members'}</p>
            </motion.div>

            {/* Total Fortunes */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4 text-center"
            >
              <Sparkles className="w-6 h-6 text-gold-400 mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-gold-400">{stats?.fortunes?.total ?? 0}</p>
              <p className="text-deep-purple-300 text-xs sm:text-sm">{language === 'tr' ? 'Fal Bakıldı' : 'Fortunes Read'}</p>
            </motion.div>

            {/* Chat Online */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4 text-center"
            >
              <MessageCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-green-400">{stats?.chat?.totalOnline ?? 0}</p>
              <p className="text-deep-purple-300 text-xs sm:text-sm">{language === 'tr' ? 'Sohbette' : 'In Chat'}</p>
            </motion.div>

            {/* Social Active */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/50 border border-purple-500/30 rounded-xl p-4 text-center"
            >
              <Activity className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-pink-400">{stats?.social?.activeUsers ?? 0}</p>
              <p className="text-deep-purple-300 text-xs sm:text-sm">{language === 'tr' ? 'Sosyal Aktif' : 'Social Active'}</p>
            </motion.div>
          </div>

          {/* Fortune Stats */}
          {stats?.fortunes?.byType && Object.keys(stats.fortunes.byType).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/30 border border-purple-500/20 rounded-xl p-4 sm:p-6"
            >
              <h3 className="text-gold-400 font-serif text-lg sm:text-xl mb-4 text-center">
                {language === 'tr' ? '🔮 Fal Türlerine Göre' : '🔮 By Fortune Type'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {Object.entries(stats.fortunes.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="bg-deep-purple-950/50 rounded-lg p-3 flex items-center gap-2">
                      <span className="text-xl">{FORTUNE_NAMES[type]?.icon || '🔮'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-deep-purple-200 text-xs truncate">
                          {FORTUNE_NAMES[type]?.[language] || type}
                        </p>
                        <p className="text-gold-400 font-bold text-sm">{count}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* Chat Rooms & Social Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Chat Rooms */}
            {stats?.chat?.rooms && stats.chat.rooms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-deep-purple-900/30 border border-purple-500/20 rounded-xl p-4"
              >
                <h3 className="text-purple-300 font-medium text-sm mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
                </h3>
                <div className="space-y-2">
                  {stats.chat.rooms.map(room => (
                    <Link 
                      key={room.id} 
                      href={`/${language}/chat/${room.slug}`}
                      className="flex items-center justify-between bg-deep-purple-950/50 rounded-lg p-2 hover:bg-deep-purple-800/50 transition-colors"
                    >
                      <span className="text-deep-purple-200 text-sm flex items-center gap-2">
                        <span>{room.icon}</span>
                        {language === 'tr' ? room.nameTr : room.nameEn}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${room.onlineCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-deep-purple-700 text-deep-purple-400'}`}>
                        {room.onlineCount} {language === 'tr' ? 'kişi' : 'online'}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Social Stats */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-deep-purple-900/30 border border-purple-500/20 rounded-xl p-4"
            >
              <h3 className="text-purple-300 font-medium text-sm mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                {language === 'tr' ? 'Sosyal Aktivite' : 'Social Activity'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-deep-purple-950/50 rounded-lg p-3">
                  <span className="text-deep-purple-200 text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    {language === 'tr' ? 'Toplam Paylaşım' : 'Total Posts'}
                  </span>
                  <span className="text-gold-400 font-bold">{stats?.social?.totalPosts ?? 0}</span>
                </div>
                <div className="flex items-center justify-between bg-deep-purple-950/50 rounded-lg p-3">
                  <span className="text-deep-purple-200 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    {language === 'tr' ? 'Bugün Aktif Kullanıcı' : 'Active Users Today'}
                  </span>
                  <span className="text-green-400 font-bold">{stats?.social?.activeUsers ?? 0}</span>
                </div>
                <Link 
                  href={`/${language}/social`}
                  className="block text-center py-2 bg-gold-600/20 text-gold-400 rounded-lg hover:bg-gold-600/30 transition-colors text-sm font-medium"
                >
                  {language === 'tr' ? 'Sosyal Akışı Gör →' : 'View Social Feed →'}
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Chat & Social Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-deep-purple-975">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gold-500 gold-glow mb-3 sm:mb-4">
              {language === 'tr' ? 'Topluluk' : 'Community'}
            </h2>
            <p className="text-deep-purple-200 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4">
              {language === 'tr' 
                ? 'Sohbet et, paylaş ve diğer fal meraklılarıyla etkileşime geç'
                : 'Chat, share and interact with other fortune enthusiasts'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Chat Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Link href={`/${language}/chat`} className="block group">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-deep-purple-950 border border-purple-500/30 p-6 sm:p-8 hover:border-gold-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold-500/10 to-transparent rounded-bl-full" />
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-gold-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl text-gold-400 group-hover:text-gold-300">
                        {language === 'tr' ? 'Sohbet Odaları' : 'Chat Rooms'}
                      </h3>
                      <p className="text-purple-300 text-sm flex items-center gap-2">
                        {language === 'tr' ? 'Canlı sohbet' : 'Live chat'}
                        {stats?.chat?.totalOnline ? (
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                            {stats.chat.totalOnline} {language === 'tr' ? 'çevrimiçi' : 'online'}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-deep-purple-200 text-sm sm:text-base mb-4">
                    {language === 'tr' 
                      ? 'Fal yorumları hakkında sohbet et, deneyimlerini paylaş ve diğer kullanıcılarla anlık mesajlaş.'
                      : 'Chat about fortune readings, share your experiences and message with other users in real-time.'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-gold-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      {language === 'tr' ? 'Sohbete Katıl' : 'Join Chat'}
                    </span>
                    <span className="ml-1">→</span>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Social Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Link href={`/${language}/social`} className="block group">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-deep-purple-950 border border-purple-500/30 p-6 sm:p-8 hover:border-gold-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold-500/10 to-transparent rounded-bl-full" />
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-gold-500 to-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Share2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl text-gold-400 group-hover:text-gold-300">
                        {language === 'tr' ? 'Sosyal Akış' : 'Social Feed'}
                      </h3>
                      <p className="text-purple-300 text-sm flex items-center gap-2">
                        {language === 'tr' ? 'Paylaş & Keşfet' : 'Share & Discover'}
                        {stats?.social?.totalPosts ? (
                          <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 rounded-full">
                            {stats.social.totalPosts} {language === 'tr' ? 'paylaşım' : 'posts'}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-deep-purple-200 text-sm sm:text-base mb-4">
                    {language === 'tr' 
                      ? 'Fallarını paylaş, diğer kullanıcıların deneyimlerini gör, beğen ve yorum yap. TikTok\'ta da paylaşabilirsin!'
                      : 'Share your fortunes, see other users\' experiences, like and comment. You can also share on TikTok!'}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gold-400 font-medium group-hover:translate-x-2 transition-transform duration-300">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">
                        {language === 'tr' ? 'Keşfet' : 'Explore'}
                      </span>
                      <span className="ml-1">→</span>
                    </div>
                    <div className="flex items-center gap-1 text-purple-400 text-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-deep-purple-975">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-gold-500 gold-glow">
              {language === 'tr' ? 'Nasıl Çalışır?' : 'How It Works'}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((step) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: step * 0.2 }}
                viewport={{ once: true }}
                className="text-center space-y-3 sm:space-y-4"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gold-600/20 rounded-full flex items-center justify-center border-2 border-gold-600">
                  <span className="text-2xl sm:text-3xl font-serif text-gold-500 font-bold">{step}</span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-gold-400">
                  {step === 1 && (language === 'tr' ? 'Fal Türünü Seç' : 'Choose Your Fortune')}
                  {step === 2 && (language === 'tr' ? 'Bilgilerini Gir' : 'Enter Your Details')}
                  {step === 3 && (language === 'tr' ? 'Falını Al' : 'Get Your Reading')}
                </h3>
                <p className="text-deep-purple-300 text-xs sm:text-sm px-2">
                  {step === 1 && (language === 'tr' ? 'Kahve falı, tarot, kurşun dökme ve daha fazlası' : 'Coffee, tarot, lead pouring and more')}
                  {step === 2 && (language === 'tr' ? 'Fincanınızı, sorunuzu veya rüyanızı paylaşın' : 'Share your cup, question, or dream details')}
                  {step === 3 && (language === 'tr' ? 'Yapay zeka destekli kişisel falınızı alın' : 'Receive your AI-powered personalized reading')}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
