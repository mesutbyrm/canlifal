'use client'

import { useState } from 'react'
import { X, Sparkles, Send, Eye, EyeOff, BarChart3, Plus, Trash2, Wand2 } from 'lucide-react'
import { mockCategories, mockTags } from '@/lib/sorbak/mock-data'
import { PLATFORM_NAME } from '@/lib/sorbak/types'

interface AskQuestionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AskQuestionModal({ isOpen, onClose }: AskQuestionModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [targetAudience, setTargetAudience] = useState<'all' | 'male' | 'female'>('all')
  const [showPoll, setShowPoll] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [aiSuggesting, setAiSuggesting] = useState(false)

  if (!isOpen) return null

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : prev.length < 5 ? [...prev, tagName] : prev)
  }

  const addPollOption = () => setPollOptions(prev => prev.length < 5 ? [...prev, ''] : prev)
  const removePollOption = (idx: number) => setPollOptions(prev => prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev)
  const updatePollOption = (idx: number, val: string) => setPollOptions(prev => prev.map((o, i) => i === idx ? val : o))

  const handleAISuggest = () => {
    setAiSuggesting(true)
    setTimeout(() => {
      if (title.length > 5) setTitle(title + ' - Nas\u0131l ba\u015fa \u00e7\u0131kar\u0131m?')
      setAiSuggesting(false)
    }, 1000)
  }

  const audiences = [
    { value: 'all' as const, label: 'Herkes', icon: '\ud83c\udf0d' },
    { value: 'female' as const, label: 'Kad\u0131nlar', icon: '\ud83d\udc69' },
    { value: 'male' as const, label: 'Erkekler', icon: '\ud83d\udc68' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1030] border border-purple-500/20 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1030]/95 backdrop-blur-sm rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> Soru Sor
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Ba\u015fl\u0131k</label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Akl\u0131ndaki soruyu yaz..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition text-sm"
                maxLength={200}
              />
              <button
                onClick={handleAISuggest}
                disabled={aiSuggesting || title.length < 3}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[11px] font-medium hover:bg-purple-500/30 transition disabled:opacity-30"
              >
                <Wand2 className={`w-3.5 h-3.5 inline mr-1 ${aiSuggesting ? 'animate-spin' : ''}`} />AI \u00d6ner
              </button>
            </div>
            <p className="text-[11px] text-white/30 mt-1">{title.length}/200</p>
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">A\u00e7\u0131klama</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Sorunu detayl\u0131 a\u00e7\u0131kla... (iste\u011fe ba\u011fl\u0131)"
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition text-sm resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Kategori</label>
            <div className="grid grid-cols-2 gap-1.5">
              {mockCategories.slice(0, 6).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    categoryId === cat.id
                      ? 'bg-purple-500/30 border border-purple-400/50 text-white'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>{cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Etiketler <span className="text-white/30">(en fazla 5)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {mockTags.slice(0, 8).map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                    selectedTags.includes(tag.name)
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-400/50'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-1.5 block">Hedef Kitle</label>
            <div className="flex gap-2">
              {audiences.map(a => (
                <button
                  key={a.value}
                  onClick={() => setTargetAudience(a.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${
                    targetAudience === a.value
                      ? 'bg-purple-500/30 border border-purple-400/50 text-white'
                      : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
              isAnonymous
                ? 'bg-purple-500/20 border-purple-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Anonim Payla\u015f
            </span>
            <div className={`w-10 h-5 rounded-full transition-colors ${isAnonymous ? 'bg-purple-500' : 'bg-white/20'}`}>
              <div className={`w-4 h-4 mt-0.5 rounded-full bg-white transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {/* Poll Toggle */}
          <button
            onClick={() => setShowPoll(!showPoll)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
              showPoll
                ? 'bg-blue-500/20 border-blue-400/40 text-white'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4" /> Anket Ekle
            </span>
            <div className={`w-10 h-5 rounded-full transition-colors ${showPoll ? 'bg-blue-500' : 'bg-white/20'}`}>
              <div className={`w-4 h-4 mt-0.5 rounded-full bg-white transition-transform ${showPoll ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {showPoll && (
            <div className="space-y-2 pl-2">
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updatePollOption(idx, e.target.value)}
                    placeholder={`Se\u00e7enek ${idx + 1}`}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removePollOption(idx)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button onClick={addPollOption} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                  <Plus className="w-3.5 h-3.5" /> Se\u00e7enek Ekle
                </button>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            disabled={title.trim().length < 5 || !categoryId}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-purple-500 hover:to-purple-400 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> Yay\u0131nla
          </button>
        </div>
      </div>
    </div>
  )
}
