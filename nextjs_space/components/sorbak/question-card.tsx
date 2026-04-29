'use client'

import Link from 'next/link'
import { SBQuestion } from '@/lib/sorbak/types'
import { MessageCircle, Eye, ArrowUp, ArrowDown, Clock, TrendingUp, Star, Crown, Users } from 'lucide-react'
import { useState } from 'react'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'Az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat`
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün`
  return `${Math.floor(diff / 604800)} hafta`
}

function UserAvatar({ user, isAnonymous, size = 'sm' }: { user: SBQuestion['author']; isAnonymous: boolean; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (isAnonymous) {
    return <div className={`${sz} rounded-full bg-gray-600 flex items-center justify-center`}>\ud83d\udc64</div>
  }
  const initial = user.displayName.charAt(0).toUpperCase()
  const colors = ['bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500']
  const colorIdx = user.id.charCodeAt(1) % colors.length
  return (
    <div className={`${sz} rounded-full ${colors[colorIdx]} flex items-center justify-center font-bold text-white`}>
      {initial}
    </div>
  )
}

export default function QuestionCard({ question }: { question: SBQuestion }) {
  const [votes, setVotes] = useState(question.voteCount)
  const [userVote, setUserVote] = useState(question.userVote)

  const handleVote = (dir: 'up' | 'down', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (userVote === dir) { setUserVote(null); setVotes(votes + (dir === 'up' ? -1 : 1)) }
    else { setUserVote(dir); setVotes(votes + (dir === 'up' ? (userVote === 'down' ? 2 : 1) : (userVote === 'up' ? -2 : -1))) }
  }

  return (
    <Link href={`/sorbak/soru/${question.slug}`} className="block">
      <div className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 ${
        question.isPremium ? 'ring-1 ring-amber-500/30' : ''
      }`}>
        {/* Badges Row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {question.isTrending && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold">
              <TrendingUp className="w-3 h-3" /> Trend
            </span>
          )}
          {question.isEditorPick && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
              <Star className="w-3 h-3" /> Editör Seçimi
            </span>
          )}
          {question.isPremium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
          {question.targetAudience !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
              <Users className="w-3 h-3" /> {question.targetAudience === 'female' ? 'Kadınlara' : 'Erkeklere'}
            </span>
          )}
        </div>

        {/* Author + Time */}
        <div className="flex items-center gap-2 mb-2">
          <UserAvatar user={question.author} isAnonymous={question.isAnonymous} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-white/90 truncate">
                {question.isAnonymous ? 'Anonim' : question.author.displayName}
              </span>
              {question.author.role === 'expert' && !question.isAnonymous && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400">UZMAN</span>
              )}
              {question.author.isPremium && !question.isAnonymous && (
                <Crown className="w-3 h-3 text-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/40">
              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(question.createdAt)}</span>
              <span style={{ color: question.category.color }}>{question.category.icon} {question.category.name}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white leading-snug mb-1.5 group-hover:text-purple-300 transition-colors line-clamp-2">
          {question.title}
        </h3>

        {/* Body Preview */}
        <p className="text-sm text-white/50 line-clamp-2 mb-3 leading-relaxed">
          {question.body}
        </p>

        {/* Poll Preview */}
        {question.poll && (
          <div className="mb-3 space-y-1.5">
            {question.poll.map(opt => (
              <div key={opt.id} className="relative h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <div className="absolute inset-y-0 left-0 bg-purple-500/20 rounded-lg" style={{ width: `${opt.percentage}%` }} />
                <div className="relative flex items-center justify-between px-3 h-full">
                  <span className="text-xs text-white/80">{opt.text}</span>
                  <span className="text-xs font-bold text-purple-300">{opt.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.tags.slice(0, 3).map(tag => (
              <span key={tag.id} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-medium">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Votes + Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-1">
            <button onClick={(e) => handleVote('up', e)} className={`p-1 rounded-lg hover:bg-white/10 transition ${userVote === 'up' ? 'text-purple-400' : 'text-white/40'}`}>
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold min-w-[24px] text-center ${votes > 0 ? 'text-purple-400' : votes < 0 ? 'text-red-400' : 'text-white/40'}`}>{votes}</span>
            <button onClick={(e) => handleVote('down', e)} className={`p-1 rounded-lg hover:bg-white/10 transition ${userVote === 'down' ? 'text-red-400' : 'text-white/40'}`}>
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-white/40">
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{question.answerCount}</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{question.viewCount > 999 ? `${(question.viewCount / 1000).toFixed(1)}K` : question.viewCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
