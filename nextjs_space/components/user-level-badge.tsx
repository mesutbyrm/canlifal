'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

const LEVEL_TITLES: Record<number, string> = {
  1: 'Yeni \u00dcye',
  2: '\u00c7\u0131rak',
  3: 'Ke\u015fif\u00e7i',
  4: 'Yorumcu',
  5: 'Bilge',
  6: 'Usta Yorumcu',
  7: 'Gizemci',
  8: 'Kahin',
  9: 'B\u00fcy\u00fck Kahin',
  10: 'Efsanevi',
}

export default function UserLevelBadge({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession() || {}
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!session?.user) return
    fetch('/api/user/xp')
      .then(r => r.json())
      .then(data => {
        setXp(data.xp || 0)
        setLevel(data.level || 1)
        setTitle(data.title || '')
        setProgress(data.progress || 0)
      })
      .catch(() => {})
  }, [session])

  if (!session?.user) return null

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 bg-fuchsia-900/30 px-2 py-1 rounded-full">
        <Star className="w-3.5 h-3.5 text-fuchsia-400" />
        <span className="text-fuchsia-300 text-xs font-medium">Lv.{level}</span>
      </div>
    )
  }

  return (
    <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-fuchsia-600/30 rounded-full flex items-center justify-center">
            <Star className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Seviye {level}</p>
            <p className="text-purple-400 text-xs">{title || LEVEL_TITLES[Math.min(level, 10)] || 'Efsanevi'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-fuchsia-300 font-bold text-sm">{xp} XP</p>
          <p className="text-purple-500 text-xs flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {100 - (xp % 100)} XP kald\u0131
          </p>
        </div>
      </div>
      <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8 }}
          className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500 rounded-full"
        />
      </div>
    </div>
  )
}
