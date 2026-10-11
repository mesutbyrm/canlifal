'use client'

import { useState, useMemo } from 'react'
import { Search, Plus, Bell, Sparkles, TrendingUp, MessageCircle, ChevronRight } from 'lucide-react'
import { mockQuestions, mockCategories, mockTags } from '@/lib/sorbak/mock-data'
import { PLATFORM_NAME, FeedTab } from '@/lib/sorbak/types'
import QuestionCard from '@/components/sorbak/question-card'
import FeedTabs from '@/components/sorbak/feed-tabs'
import RightSidebar from '@/components/sorbak/right-sidebar'
import AskQuestionModal from '@/components/sorbak/ask-question-modal'
import Link from 'next/link'

export default function SorBakPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou')
  const [showAskModal, setShowAskModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredQuestions = useMemo(() => {
    let qs = [...mockQuestions]
    switch (activeTab) {
      case 'trending': qs = qs.filter(q => q.isTrending); break
      case 'new': qs = qs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'top': qs = qs.sort((a, b) => b.voteCount - a.voteCount); break
      case 'polls': qs = qs.filter(q => q.poll !== null); break
      case 'expert': qs = qs.filter(q => q.bestAnswerId !== null); break
      case 'editor': qs = qs.filter(q => q.isEditorPick); break
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      qs = qs.filter(item => item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
    }
    return qs
  }, [activeTab, searchQuery])

  return (
    <div className="min-h-screen">
      {/* Hero / Quick Ask */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 pt-6 pb-4">
          <div className="text-center mb-5">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 inline text-purple-400 mr-1" />{PLATFORM_NAME}
            </h1>
            <p className="text-sm text-white/50">Merak ettiğin her şeyi sor, topluluktan cevap al</p>
          </div>

          {/* Search + Ask */}
          <div className="flex gap-2 max-w-xl mx-auto mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Soru ara..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition"
              />
            </div>
            <button
              onClick={() => setShowAskModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Soru Sor
            </button>
          </div>

          {/* Quick Ask Box */}
          <div
            onClick={() => setShowAskModal(true)}
            className="max-w-xl mx-auto mb-5 p-3.5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/8 hover:border-purple-500/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm text-white/30 group-hover:text-white/50 transition">Aklındaki soruyu yaz...</span>
            </div>
          </div>

          {/* Categories Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
            {mockCategories.map(cat => (
              <Link
                key={cat.id}
                href={`/sorbak?cat=${cat.slug}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white/80 transition whitespace-nowrap"
              >
                <span>{cat.icon}</span>{cat.name}
                <span className="text-white/20 ml-0.5">{cat.questionCount > 999 ? `${(cat.questionCount / 1000).toFixed(1)}K` : cat.questionCount}</span>
              </Link>
            ))}
          </div>

          {/* Trending Tags */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <TrendingUp className="w-4 h-4 text-red-400 flex-shrink-0" />
            {mockTags.slice(0, 6).map(tag => (
              <span key={tag.id} className="text-[11px] text-purple-300 font-medium hover:text-purple-200 cursor-pointer transition whitespace-nowrap">
                #{tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: 3 Column Layout */}
      <div className="max-w-6xl mx-auto px-4 pb-28 lg:pb-8">
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
          {/* Feed */}
          <div>
            <FeedTabs active={activeTab} onChange={setActiveTab} />
            <div className="mt-3 space-y-3">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map(q => <QuestionCard key={q.id} question={q} />)
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">Bu kategoride henüz soru yok</p>
                  <button onClick={() => setShowAskModal(true)} className="mt-3 px-4 py-2 bg-purple-500/20 text-purple-300 text-sm rounded-xl hover:bg-purple-500/30 transition">
                    İlk soruyu sen sor!
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Desktop only */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0f0520]/95 backdrop-blur-lg border-t border-white/10">
        <div className="flex items-center justify-around py-2">
          <Link href="/sorbak" className="flex flex-col items-center gap-0.5 text-purple-400">
            <Sparkles className="w-5 h-5" />
            <span className="text-[10px] font-medium">Ana Sayfa</span>
          </Link>
          <Link href="/sorbak" className="flex flex-col items-center gap-0.5 text-white/40">
            <Search className="w-5 h-5" />
            <span className="text-[10px]">Keşfet</span>
          </Link>
          <button
            onClick={() => setShowAskModal(true)}
            className="-mt-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center shadow-xl shadow-purple-500/30 border-4 border-[#0f0520]"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
          <Link href="/sorbak" className="flex flex-col items-center gap-0.5 text-white/40">
            <Bell className="w-5 h-5" />
            <span className="text-[10px]">Bildirim</span>
          </Link>
          <Link href="/sorbak" className="flex flex-col items-center gap-0.5 text-white/40">
            <div className="w-5 h-5 rounded-full bg-white/20" />
            <span className="text-[10px]">Profil</span>
          </Link>
        </div>
      </div>

      <AskQuestionModal isOpen={showAskModal} onClose={() => setShowAskModal(false)} />
    </div>
  )
}
