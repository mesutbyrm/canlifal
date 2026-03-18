'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Trophy, ThumbsUp, Send, Loader2, Clock, Users, Crown, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Contest {
  id: string
  title: string
  description: string
  dreamPrompt: string
  startDate: string
  endDate: string
  isOngoing: boolean
  isEnded: boolean
  entryCount: number
}

interface Entry {
  id: string
  interpretation: string
  voteCount: number
  createdAt: string
  user: { id: string; name: string; image: string | null; username: string | null }
}

export default function DreamContestPage() {
  const { lang } = useParams()
  const { data: session } = useSession() || {}
  const [contests, setContests] = useState<Contest[]>([])
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [userVotedIds, setUserVotedIds] = useState<string[]>([])
  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dream-contest').then(r => r.json()).then(data => {
      setContests(data.contests || [])
      if (data.contests?.length > 0) setSelectedContest(data.contests[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedContest) fetchEntries(selectedContest.id)
  }, [selectedContest])

  const fetchEntries = async (contestId: string) => {
    try {
      const res = await fetch(`/api/dream-contest/${contestId}/entries`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setUserVotedIds(data.userVotedEntryIds || [])
      }
    } catch (e) { console.error(e) }
  }

  const handleSubmitEntry = async () => {
    if (!selectedContest || !interpretation.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/dream-contest/${selectedContest.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpretation }),
      })
      if (res.ok) {
        setInterpretation('')
        fetchEntries(selectedContest.id)
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } catch (e) { console.error(e) }
    setSubmitting(false)
  }

  const handleVote = async (entryId: string) => {
    if (!selectedContest) return
    setVoting(entryId)
    try {
      const res = await fetch(`/api/dream-contest/${selectedContest.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })
      if (res.ok) fetchEntries(selectedContest.id)
    } catch (e) { console.error(e) }
    setVoting(null)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-400" size={32} /></div>

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-full mb-4">
          <Trophy size={18} />
          <span>Rüya Yarışması</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Rüya Yorumu Yarışması</h1>
        <p className="text-white/60">Haftalık rüyayı yorumlayın, topluluk oylasın!</p>
      </div>

      {contests.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
          <Sparkles size={48} className="mx-auto mb-4 text-amber-400/40" />
          <p className="text-white/60">Şu an aktif yarışma bulunmuyor</p>
          <p className="text-white/40 text-sm mt-1">Yakında yeni yarışmalar başlayacak!</p>
        </div>
      ) : (
        <>
          {/* Contest selector */}
          {contests.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {contests.map(c => (
                <button key={c.id} onClick={() => setSelectedContest(c)}
                  className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
                    selectedContest?.id === c.id ? 'bg-amber-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}>
                  {c.title}
                </button>
              ))}
            </div>
          )}

          {selectedContest && (
            <>
              {/* Contest Info */}
              <div className="bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{selectedContest.title}</h2>
                <p className="text-white/60 text-sm mb-4">{selectedContest.description}</p>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-purple-300 font-semibold mb-2">\ud83d\udcad Rüya:</p>
                  <p className="text-white/80 italic">{selectedContest.dreamPrompt}</p>
                </div>
                <div className="flex gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1"><Clock size={14} />
                    {selectedContest.isOngoing ? 'Devam ediyor' : selectedContest.isEnded ? 'Sona erdi' : 'Başlamadı'}
                  </span>
                  <span className="flex items-center gap-1"><Users size={14} /> {selectedContest.entryCount} katılımcı</span>
                </div>
              </div>

              {/* Submit Entry */}
              {selectedContest.isOngoing && session?.user && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Send size={16} /> Yorumunuzu Gönderin</h3>
                  <textarea
                    placeholder="Rüyayı yorumlayın... (en az 20 karakter)"
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none mb-3 focus:outline-none focus:border-amber-500/50"
                  />
                  <button onClick={handleSubmitEntry} disabled={submitting || interpretation.length < 20}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm transition-colors flex items-center gap-2">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Gönder
                  </button>
                </div>
              )}

              {!session?.user && selectedContest.isOngoing && (
                <div className="text-center py-4 mb-6 bg-white/5 border border-white/10 rounded-xl">
                  <Link href={`/${lang}/login`} className="text-amber-400 hover:text-amber-300">Katılmak için giriş yapın</Link>
                </div>
              )}

              {/* Entries */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><Crown size={16} className="text-amber-400" /> Yorumlar ({entries.length})</h3>
                {entries.map((entry, idx) => (
                  <div key={entry.id} className={`bg-white/5 border rounded-xl p-4 ${
                    idx === 0 && selectedContest.isEnded ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && selectedContest.isEnded && <Crown size={16} className="text-amber-400" />}
                        <span className="text-white font-medium text-sm">{entry.user.name}</span>
                        {entry.user.username && <span className="text-white/30 text-xs">@{entry.user.username}</span>}
                      </div>
                      <span className="text-white/30 text-xs">{new Date(entry.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p className="text-white/70 text-sm mb-3 whitespace-pre-wrap">{entry.interpretation}</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(entry.id)}
                        disabled={!session?.user || voting === entry.id}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                          userVotedIds.includes(entry.id)
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {voting === entry.id ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                        {entry.voteCount}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
