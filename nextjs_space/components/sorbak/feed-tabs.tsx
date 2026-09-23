'use client'

import { FeedTab } from '@/lib/sorbak/types'
import { Flame, Sparkles, Clock, Trophy, BarChart3, GraduationCap, Star } from 'lucide-react'

const tabs: { key: FeedTab; label: string; icon: React.ReactNode }[] = [
  { key: 'foryou', label: 'Sana Özel', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'trending', label: 'Trend', icon: <Flame className="w-3.5 h-3.5" /> },
  { key: 'new', label: 'Yeni', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'top', label: 'En İyi', icon: <Trophy className="w-3.5 h-3.5" /> },
  { key: 'polls', label: 'Anketler', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { key: 'expert', label: 'Uzman', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { key: 'editor', label: 'Seçme', icon: <Star className="w-3.5 h-3.5" /> },
]

interface FeedTabsProps {
  active: FeedTab
  onChange: (tab: FeedTab) => void
}

export default function FeedTabs({ active, onChange }: FeedTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
            active === tab.key
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
