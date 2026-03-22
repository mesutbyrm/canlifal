'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react'
import BanaOzelSection from '@/components/bana-ozel-section'

interface Section {
  id: string
  key: string
  title: string
  icon: string
  isVisible: boolean
  sortOrder: number
}

interface CustomButton {
  id: string
  label: string
  icon: string
  href: string
  isVisible: boolean
  sortOrder: number
  bgColor: string
  borderColor: string
  textColor: string
}

const FORTUNE_CARDS = [
  { id: 'coffee', nameTr: 'Kahve Falı', image: 'https://cdn.abacus.ai/images/21ba0a63-b56d-4d57-ba0b-de973fac37bc.png', href: '/fallar/kahve-fali' },
  { id: 'tarot', nameTr: 'Tarot Falı', image: 'https://cdn.abacus.ai/images/ca544a3b-1bab-4e8d-b59b-74c1c45f1a5a.png', href: '/fallar/tarot-fali' },
  { id: 'palm', nameTr: 'El Falı', image: 'https://cdn.abacus.ai/images/b4f2cb29-d97d-45c0-bac0-a1b0defc320b.png', href: '/fallar/el-fali' },
  { id: 'dream', nameTr: 'Rüya Tabiri', image: 'https://cdn.abacus.ai/images/087f00ec-3e0e-4330-be79-a7d11efdf65b.png', href: '/fallar/ruya-yorumu' },
  { id: 'love', nameTr: 'Aşk Uyumu', image: 'https://cdn.abacus.ai/images/63500b4d-2875-46e7-b3ab-720016070d0c.png', href: '/fallar/ask-uyumu' },
  { id: 'horoscope', nameTr: 'Günlük Burç', image: 'https://cdn.abacus.ai/images/fc019303-9170-4a35-a30a-9dafbe6cd0bb.png', href: '/fallar/burc-yorumu' },
  { id: 'numerology', nameTr: 'Numeroloji', image: 'https://cdn.abacus.ai/images/f16750b2-d611-45af-a2ec-bb912ea71c80.png', href: '/fallar/numeroloji' },
  { id: 'angel', nameTr: 'Melek Kartları', image: 'https://cdn.abacus.ai/images/2983a121-7c1b-4d68-9d58-753b8bec3f5c.png', href: '/fallar/melek-kartlari' },
  { id: 'aura', nameTr: 'Aura Okuma', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi' },
  { id: 'birthchart', nameTr: 'Doğum Haritası', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi' },
  { id: 'katina', nameTr: 'Katina Falı', image: '/fortunes/katina.jpg', href: '/fallar/katina' },
  { id: 'yesno', nameTr: 'Evet/Hayır', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir' },
  { id: 'kursundokme', nameTr: 'Kurşun Dökme', image: '/fortunes/dream.jpg', href: '/fallar/kursundokme' },
  { id: 'istikhara', nameTr: 'İstihare', image: '/fortunes/angel.jpg', href: '/fallar/istihare' },
]

export default function OnlineFalPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession() || {}
  const lang = (params?.lang as string) || 'tr'

  const [sections, setSections] = useState<Section[]>([])
  const [buttons, setButtons] = useState<CustomButton[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/online-fal')
      if (res.ok) {
        const data = await res.json()
        setSections(data.sections || [])
        setButtons(data.buttons || [])
      }
    } catch (e) {
      console.error('Failed to fetch online fal data', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sectionMap: Record<string, Section> = {}
  sections.forEach((s) => { sectionMap[s.key] = s })

  const cardStagger = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: i * 0.04, duration: 0.35, ease: 'easeOut' },
    }),
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  // Render sections in sorted order
  const renderSection = (section: Section) => {
    switch (section.key) {
      case 'fortune_types':
        return (
          <motion.div
            key={section.key}
            className="falclub-card p-4"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h2 className="falclub-section-title mb-4">
              <span className="text-lg mr-1">{section.icon}</span>
              {section.title}
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {FORTUNE_CARDS.map((fortune, idx) => (
                <motion.div
                  key={fortune.id}
                  custom={idx}
                  variants={cardStagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Link
                    href={`/${lang}${fortune.href}`}
                    className="flex flex-col items-center group"
                  >
                    <motion.div
                      className="falclub-icon-circle w-14 h-14 transition-all group-hover:scale-110"
                      whileHover={{ scale: 1.15, rotate: 3 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Image
                        src={fortune.image}
                        alt={fortune.nameTr}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <span className="text-fuchsia-200 text-[10px] font-medium mt-1.5 text-center leading-tight">
                      {fortune.nameTr}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )

      case 'bana_ozel':
        if (!session?.user) return null
        return (
          <motion.div
            key={section.key}
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <BanaOzelSection />
          </motion.div>
        )

      case 'custom_buttons':
        if (buttons.length === 0) return null
        return (
          <motion.div
            key={section.key}
            className="falclub-card p-4"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <h2 className="falclub-section-title mb-4">
              <span className="text-lg mr-1">{section.icon}</span>
              {section.title}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {buttons.map((btn, idx) => (
                <motion.div
                  key={btn.id}
                  custom={idx}
                  variants={cardStagger}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Link
                    href={`/${lang}${btn.href}`}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-gradient-to-br ${btn.bgColor} border ${btn.borderColor} ${btn.textColor} hover:scale-105 transition-all duration-300 group`}
                  >
                    <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">{btn.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{btn.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen falclub-starry-bg relative overflow-hidden">
      {/* Background stars */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${(i * 17 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
              opacity: ((i * 37) % 80 + 20) / 100,
              animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite alternate`,
              animationDelay: `${(i * 0.3) % 4}s`,
            }}
          />
        ))}
      </div>

      {/* Floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full"
          style={{ width: 180, height: 180, left: '-5%', top: '30%', background: 'radial-gradient(circle, rgba(192,38,211,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}
          animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ width: 140, height: 140, right: '-5%', top: '60%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
          animate={{ x: [0, -20, 15, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 pt-20 pb-28 px-3 sm:px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push(`/${lang}`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-fuchsia-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-fuchsia-300 via-purple-200 to-fuchsia-300 bg-clip-text text-transparent">
              Canlı Fal
            </h1>
            <p className="text-fuchsia-300/60 text-xs">Tüm fal türleri ve kişisel deneyimler</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-3xl ml-auto"
          >
            🔮
          </motion.div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  )
}
