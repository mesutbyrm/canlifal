'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Check,
  Gamepad2,
  Gift,
  Video,
  Users,
  MessageCircle,
  GripVertical,
  LayoutList,
  Sparkles,
  BookOpen
} from 'lucide-react'

const BUTTON_INFO: Record<string, { icon: React.ReactNode; labelTr: string; labelEn: string; color: string }> = {
  games: {
    icon: <Gamepad2 className="w-5 h-5" />,
    labelTr: 'Oyun Merkezi',
    labelEn: 'Game Center',
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40',
  },
  gifts: {
    icon: <Gift className="w-5 h-5" />,
    labelTr: 'Hediye Gönder',
    labelEn: 'Send Gift',
    color: 'from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500/40',
  },
  teller: {
    icon: <Video className="w-5 h-5" />,
    labelTr: 'Falcı Paneli',
    labelEn: 'Teller Panel',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40',
  },
  social: {
    icon: <Users className="w-5 h-5" />,
    labelTr: 'Sosyal',
    labelEn: 'Social',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/40',
  },
  chat: {
    icon: <MessageCircle className="w-5 h-5" />,
    labelTr: 'Fal Sohbet',
    labelEn: 'Fortune Chat',
    color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40',
  },
  blog: {
    icon: <BookOpen className="w-5 h-5" />,
    labelTr: 'Blog',
    labelEn: 'Blog',
    color: 'from-orange-500/20 to-red-500/20 border-orange-500/40',
  },
  'bana-ozel': {
    icon: <Sparkles className="w-5 h-5" />,
    labelTr: 'Bana Özel',
    labelEn: 'For Me',
    color: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/40',
  },
}

const DEFAULT_ORDER = ['games', 'gifts', 'teller', 'social', 'chat', 'blog', 'bana-ozel']

export default function AdminButtonOrderPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const { language } = useLanguage()
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
      router.push(`/login`)
      return
    }
    fetchOrder()
  }, [session, status])

  const fetchOrder = async () => {
    try {
      const res = await fetch('/api/admin/button-order')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.order) && data.order.length > 0) {
          setOrder(data.order)
        }
      }
    } catch (err) {
      console.error('Fetch order error:', err)
    } finally {
      setLoading(false)
    }
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...order]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setOrder(newOrder)
    setSaved(false)
  }

  const moveDown = (index: number) => {
    if (index === order.length - 1) return
    const newOrder = [...order]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setOrder(newOrder)
    setSaved(false)
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/button-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Save order error:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = () => {
    setOrder(DEFAULT_ORDER)
    setSaved(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-lg border-b border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/admin`}
            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <LayoutList className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold text-white">
              {language === 'tr' ? 'Buton Sıralaması' : 'Button Order'}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-purple-300/70 text-sm">
          {language === 'tr'
            ? 'Ana sayfadaki aksiyon butonlarının sıralamasını değiştirin. Yukarı/aşağı oklarını kullanarak butonları sıralayın.'
            : 'Change the order of action buttons on the homepage. Use the up/down arrows to reorder buttons.'}
        </p>

        {/* Button List */}
        <div className="space-y-2">
          {order.map((key, index) => {
            const info = BUTTON_INFO[key]
            if (!info) return null
            return (
              <motion.div
                key={key}
                layout
                className={`flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-r ${info.color} backdrop-blur-sm`}
              >
                <GripVertical className="w-5 h-5 text-gray-500" />
                <span className="text-purple-300">{info.icon}</span>
                <span className="flex-1 text-white font-medium">
                  {language === 'tr' ? info.labelTr : info.labelEn}
                </span>
                <span className="text-xs text-purple-400/60 mr-2">#{index + 1}</span>
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-purple-300 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === order.length - 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-purple-300 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <Check className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving
              ? (language === 'tr' ? 'Kaydediliyor...' : 'Saving...')
              : saved
              ? (language === 'tr' ? 'Kaydedildi!' : 'Saved!')
              : (language === 'tr' ? 'Kaydet' : 'Save')}
          </button>
          <button
            onClick={resetToDefault}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 font-medium border border-purple-500/30 transition-colors"
          >
            {language === 'tr' ? 'Sıfırla' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}
