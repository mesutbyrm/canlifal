'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mockQuestions, mockAnswers, mockUsers } from '@/lib/sorbak/mock-data'
import { SBAnswer, PLATFORM_NAME } from '@/lib/sorbak/types'
import { ArrowLeft, ArrowUp, ArrowDown, MessageCircle, Eye, Clock, Share2, Bookmark, Flag, Send, CheckCircle, Crown, GraduationCap, ChevronDown, ChevronUp, Star } from 'lucide-react'
import Link from 'next/link'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'Az önce'
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`
  return `${Math.floor(diff / 86400)} gün önce`
}

function UserAvatar({ user, size = 'md' }: { user: any; size?: 'sm' | 'md' | 'lg' }) {
  const szMap = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const initial = user.displayName.charAt(0).toUpperCase()
  const colors = ['bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500']
  const colorIdx = user.id.charCodeAt(1) % colors.length
  return (
    <div className={`${szMap[size]} rounded-full ${colors[colorIdx]} flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initial}
    </div>
  )
}

function AnswerCard({ answer, isBest }: { answer: SBAnswer; isBest: boolean }) {
  const [votes, setVotes] = useState(answer.voteCount)
  const [userVote, setUserVote] = useState(answer.userVote)
  const [showComments, setShowComments] = useState(false)

  const handleVote = (dir: 'up' | 'down') => {
    if (userVote === dir) { setUserVote(null); setVotes(votes + (dir === 'up' ? -1 : 1)) }
    else { setUserVote(dir); setVotes(votes + (dir === 'up' ? (userVote === 'down' ? 2 : 1) : (userVote === 'up' ? -2 : -1))) }
  }

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      isBest
        ? 'bg-green-500/5 border-green-500/30 ring-1 ring-green-500/10'
        : answer.isExpertAnswer
        ? 'bg-purple-500/5 border-purple-500/20'
        : 'bg-white/5 border-white/10'
    }`}>
      {isBest && (
        <div className="flex items-center gap-1.5 mb-3 text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-bold">En İyi Cevap</span>
        </div>
      )}
      {answer.isExpertAnswer && !isBest && (
        <div className="flex items-center gap-1.5 mb-3 text-purple-400">
          <GraduationCap className="w-4 h-4" />
          <span className="text-xs font-bold">Uzman Görüşü</span>
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-2 mb-3">
        <UserAvatar user={answer.author} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white/90">{answer.isAnonymous ? 'Anonim' : answer.author.displayName}</span>
            {answer.author.role === 'expert' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">UZMAN</span>}
            {answer.author.isPremium && <Crown className="w-3 h-3 text-amber-400" />}
          </div>
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3" />{timeAgo(answer.createdAt)}
            {answer.author.role !== 'user' && <span className="ml-1">\u00b7 Seviye {answer.author.level}</span>}
          </span>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-white/70 leading-relaxed mb-4 whitespace-pre-wrap">{answer.body}</p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => handleVote('up')} className={`p-1.5 rounded-lg hover:bg-white/10 transition ${userVote === 'up' ? 'text-purple-400' : 'text-white/40'}`}>
            <ArrowUp className="w-4 h-4" />
          </button>
          <span className={`text-sm font-bold min-w-[20px] text-center ${votes > 0 ? 'text-purple-400' : 'text-white/40'}`}>{votes}</span>
          <button onClick={() => handleVote('down')} className={`p-1.5 rounded-lg hover:bg-white/10 transition ${userVote === 'down' ? 'text-red-400' : 'text-white/40'}`}>
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition">
          <MessageCircle className="w-3.5 h-3.5" /> {answer.comments.length} yorum
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Comments */}
      {showComments && answer.comments.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-white/5 space-y-2">
          {answer.comments.map(c => (
            <div key={c.id} className="py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-medium text-white/60">{c.author.displayName}</span>
                <span className="text-[10px] text-white/30">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-xs text-white/50">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function QuestionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const [answerText, setAnswerText] = useState('')
  const [sortBy, setSortBy] = useState<'best' | 'new' | 'top'>('best')

  const question = mockQuestions.find(q => q.slug === slug)
  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-lg mb-4">Soru bulunamadı</p>
          <Link href="/sorbak" className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm">Geri Dön</Link>
        </div>
      </div>
    )
  }

  const answers = mockAnswers
  const sortedAnswers = useMemo(() => {
    const sorted = [...answers]
    if (sortBy === 'best') sorted.sort((a, b) => (b.isBestAnswer ? 1 : 0) - (a.isBestAnswer ? 1 : 0) || b.voteCount - a.voteCount)
    else if (sortBy === 'new') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else sorted.sort((a, b) => b.voteCount - a.voteCount)
    return sorted
  }, [answers, sortBy])

  const [qVotes, setQVotes] = useState(question.voteCount)
  const [qUserVote, setQUserVote] = useState(question.userVote)
  const handleQVote = (dir: 'up' | 'down') => {
    if (qUserVote === dir) { setQUserVote(null); setQVotes(qVotes + (dir === 'up' ? -1 : 1)) }
    else { setQUserVote(dir); setQVotes(qVotes + (dir === 'up' ? (qUserVote === 'down' ? 2 : 1) : (qUserVote === 'up' ? -2 : -1))) }
  }

  const relatedQuestions = mockQuestions.filter(q => q.id !== question.id).slice(0, 3)

  return (
    <div className="min-h-screen pb-28 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 pt-4">
        {/* Back Button */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/70 transition mb-4">
          <ArrowLeft className="w-4 h-4" /> Geri
        </button>

        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
          {/* Main Content */}
          <div>
            {/* Question */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-4">
              {/* Category + Tags */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: question.category.color + '20', color: question.category.color }}>
                  {question.category.icon} {question.category.name}
                </span>
                {question.tags.map(t => (
                  <span key={t.id} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[11px]">#{t.name}</span>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-3">{question.title}</h1>

              {/* Author */}
              <div className="flex items-center gap-2.5 mb-4">
                <UserAvatar user={question.author} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white/90">{question.isAnonymous ? 'Anonim' : question.author.displayName}</span>
                    {question.author.role === 'expert' && !question.isAnonymous && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">UZMAN</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/40">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(question.createdAt)}</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{question.viewCount} görüntülenme</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <p className="text-[15px] text-white/70 leading-relaxed whitespace-pre-wrap mb-4">{question.body}</p>

              {/* Poll */}
              {question.poll && (
                <div className="mb-4 space-y-2">
                  {question.poll.map(opt => (
                    <div key={opt.id} className="relative h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer hover:border-purple-500/30 transition">
                      <div className="absolute inset-y-0 left-0 bg-purple-500/20 rounded-xl" style={{ width: `${opt.percentage}%` }} />
                      <div className="relative flex items-center justify-between px-4 h-full">
                        <span className="text-sm text-white/80">{opt.text}</span>
                        <span className="text-sm font-bold text-purple-300">{opt.percentage}% <span className="text-white/30 font-normal">({opt.votes})</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <button onClick={() => handleQVote('up')} className={`p-2 rounded-xl hover:bg-white/10 transition ${qUserVote === 'up' ? 'text-purple-400 bg-purple-400/10' : 'text-white/40'}`}>
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <span className={`text-base font-bold min-w-[28px] text-center ${qVotes > 0 ? 'text-purple-400' : 'text-white/40'}`}>{qVotes}</span>
                  <button onClick={() => handleQVote('down')} className={`p-2 rounded-xl hover:bg-white/10 transition ${qUserVote === 'down' ? 'text-red-400 bg-red-400/10' : 'text-white/40'}`}>
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white/60 transition"><Share2 className="w-4 h-4" /></button>
                  <button className="p-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-white/60 transition"><Bookmark className="w-4 h-4" /></button>
                  <button className="p-2 rounded-xl text-white/40 hover:bg-white/10 hover:text-red-400/60 transition"><Flag className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Expert CTA */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Uzmana Sor</p>
                  <p className="text-[11px] text-white/40">Bu soruya uzman görüşü al</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-purple-500/30 text-purple-300 text-xs font-bold rounded-lg hover:bg-purple-500/40 transition">
                5 Jeton
              </button>
            </div>

            {/* Answer Write */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-purple-400" /> Cevap Yaz
              </h3>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Düşüncelerini paylaş..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:border-purple-500/50 focus:outline-none resize-none mb-2"
              />
              <div className="flex justify-end">
                <button disabled={answerText.trim().length < 5} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 hover:from-purple-500 hover:to-purple-400 transition shadow-lg shadow-purple-500/20 disabled:opacity-40">
                  <Send className="w-3.5 h-3.5" /> Gönder
                </button>
              </div>
            </div>

            {/* Answers */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">{question.answerCount} Cevap</h3>
                <div className="flex gap-1">
                  {(['best', 'new', 'top'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        sortBy === s ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {s === 'best' ? 'En İyi' : s === 'new' ? 'Yeni' : 'En Çok Oy'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {sortedAnswers.map(a => (
                  <AnswerCard key={a.id} answer={a} isBest={a.id === question.bestAnswerId} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              {/* Related Questions */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400" /> Benzer Sorular
                </h3>
                <div className="space-y-3">
                  {relatedQuestions.map(rq => (
                    <Link key={rq.id} href={`/sorbak/soru/${rq.slug}`} className="block">
                      <p className="text-sm text-white/70 hover:text-purple-300 transition line-clamp-2 leading-snug">{rq.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/30">
                        <span>{rq.answerCount} cevap</span>
                        <span>{rq.viewCount > 999 ? `${(rq.viewCount / 1000).toFixed(1)}K` : rq.viewCount} görüntülenme</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Community Rules */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white mb-2">\ud83d\udee1\ufe0f Topluluk Kuralları</h3>
                <ul className="space-y-1.5 text-[11px] text-white/40">
                  <li>• Saygılı ve yapıcı olun</li>
                  <li>• Kişisel bilgi paylaşmayın</li>
                  <li>• Spam ve reklam yasaktır</li>
                  <li>• Nefret söylemi yasaktır</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
