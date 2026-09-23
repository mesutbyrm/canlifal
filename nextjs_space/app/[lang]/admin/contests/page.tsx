'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Trophy, Calendar, Loader2, Eye, EyeOff, Users } from 'lucide-react'
import Link from 'next/link'
import AdminBackButton from '@/components/admin-back-button'

interface Contest {
  id: string
  title: string
  description: string
  dreamPrompt: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  _count: { entries: number }
}

export default function AdminContestsPage() {
  const { data: session } = useSession() || {}
  const router = useRouter()
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', dreamPrompt: '', startDate: '', endDate: '' })

  const fetchContests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/contests')
      const data = await res.json()
      if (data.contests) setContests(data.contests)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if ((session?.user as any)?.role !== 'admin') {
      router.push('/')
      return
    }
    fetchContests()
  }, [session, router, fetchContests])

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = editingId ? 'PATCH' : 'POST'
      const body = editingId ? { id: editingId, ...form } : form
      const res = await fetch('/api/admin/contests', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setShowForm(false)
        setEditingId(null)
        setForm({ title: '', description: '', dreamPrompt: '', startDate: '', endDate: '' })
        fetchContests()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (contest: Contest) => {
    try {
      await fetch('/api/admin/contests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contest.id, isActive: !contest.isActive })
      })
      fetchContests()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yarışmayı silmek istediğinize emin misiniz?')) return
    try {
      await fetch(`/api/admin/contests?id=${id}`, { method: 'DELETE' })
      fetchContests()
    } catch (e) {
      console.error(e)
    }
  }

  const handleEdit = (contest: Contest) => {
    setEditingId(contest.id)
    setForm({
      title: contest.title,
      description: contest.description,
      dreamPrompt: contest.dreamPrompt,
      startDate: contest.startDate.split('T')[0],
      endDate: contest.endDate.split('T')[0]
    })
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0118] to-[#1a0533] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AdminBackButton className="p-2 rounded-lg bg-white/5 hover:bg-white/10" />
            <div>
              <h1 className="text-xl font-bold">Rüya Yarışması Yönetimi</h1>
              <p className="text-sm text-purple-400">Haftalık rüya yarışmalarını oluştur ve yönet</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', description: '', dreamPrompt: '', startDate: '', endDate: '' }) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Yeni Yarışma
          </button>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{editingId ? 'Yarışma Düzenle' : 'Yeni Yarışma'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-purple-300 mb-1 block">Başlık</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-purple-400/50"
                    placeholder="Örn: Haftanın Rüyası: Uçmak" />
                </div>
                <div>
                  <label className="text-sm text-purple-300 mb-1 block">Açıklama</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-purple-400/50 h-20 resize-none"
                    placeholder="Yarışma açıklaması" />
                </div>
                <div>
                  <label className="text-sm text-purple-300 mb-1 block">Rüya Konusu / Prompt</label>
                  <textarea value={form.dreamPrompt} onChange={e => setForm({ ...form, dreamPrompt: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-purple-400/50 h-24 resize-none"
                    placeholder="Katılımcıların yorumlayacağı rüya metni" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-purple-300 mb-1 block">Başlangıç</label>
                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
                  </div>
                  <div>
                    <label className="text-sm text-purple-300 mb-1 block">Bitiş</label>
                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving || !form.title || !form.dreamPrompt || !form.startDate || !form.endDate}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl text-sm font-medium transition">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contest List */}
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" /></div>
        ) : contests.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
            <p className="text-purple-400">Henüz yarışma yok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contests.map(contest => (
              <motion.div key={contest.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white/5 rounded-2xl p-5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{contest.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${contest.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {contest.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <p className="text-sm text-purple-400 mb-2">{contest.description}</p>
                    <div className="flex items-center gap-4 text-xs text-purple-400/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(contest.startDate).toLocaleDateString('tr-TR')} - {new Date(contest.endDate).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {contest._count.entries} katılımcı
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleActive(contest)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10" title={contest.isActive ? 'Pasif yap' : 'Aktif yap'}>
                      {contest.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleEdit(contest)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(contest.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
