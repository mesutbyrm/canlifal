'use client'

import { weeklyActiveUsers, topAnswerers, mockTags, mockCategories } from '@/lib/sorbak/mock-data'
import { Trophy, Hash, Star, Crown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

function UserRow({ user, stat, statLabel }: { user: any; stat: number; statLabel: string }) {
  const initial = user.displayName.charAt(0).toUpperCase()
  const colors = ['bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500']
  const colorIdx = user.id.charCodeAt(1) % colors.length
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className={`w-8 h-8 rounded-full ${colors[colorIdx]} flex items-center justify-center text-xs font-bold text-white`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm text-white/80 truncate font-medium">{user.displayName}</span>
          {user.isPremium && <Crown className="w-3 h-3 text-amber-400" />}
          {user.role === 'expert' && <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">UZMAN</span>}
        </div>
        <span className="text-[11px] text-white/40">{stat} {statLabel}</span>
      </div>
    </div>
  )
}

export default function RightSidebar() {
  return (
    <div className="space-y-4">
      {/* Weekly Active */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" /> Haftanın Aktif Üyeleri
        </h3>
        <div className="divide-y divide-white/5">
          {weeklyActiveUsers.map((u, i) => (
            <UserRow key={u.id} user={u} stat={u.weeklyAnswers} statLabel="cevap" />
          ))}
        </div>
      </div>

      {/* Trending Tags */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-red-400" /> Popüler Etiketler
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {mockTags.slice(0, 8).map(tag => (
            <span key={tag.id} className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-medium hover:bg-purple-500/20 cursor-pointer transition">
              <Hash className="w-3 h-3 inline mr-0.5" />{tag.name} <span className="text-white/30 ml-0.5">{tag.count > 999 ? `${(tag.count / 1000).toFixed(1)}K` : tag.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Top Answerers */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-purple-400" /> En Çok Cevap Verenler
        </h3>
        <div className="divide-y divide-white/5">
          {topAnswerers.map((u) => (
            <UserRow key={u.id} user={u} stat={u.totalAnswers} statLabel="cevap" />
          ))}
        </div>
      </div>

      {/* Premium CTA */}
      <div className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
        <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-white mb-1">Premium Ol</h3>
        <p className="text-[11px] text-white/50 mb-3">Sorularını öne çıkar, uzmanlara sor, AI özelliklerini kullan</p>
        <button className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20">
          Üçretsize Başla
        </button>
      </div>
    </div>
  )
}
