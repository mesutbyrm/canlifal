'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Calendar, PenLine, Loader2, Moon, Brain, ChevronLeft, ChevronRight, Trash2, Sparkles, BookOpen, FileText, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface DiaryEntry {
  id: string
  dreamDate: string
  title: string
  content: string
  symbols: string[]
  mood: string | null
  lucidity: number | null
  aiAnalysis: string | null
}

interface WeeklyReport {
  id: string
  weekStart: string
  weekEnd: string
  reportContent: string
  dreamCount: number
  topSymbols: string[]
}

const MOODS = [
  { value: 'happy', label: 'Mutlu', emoji: '\ud83d\ude0a' },
  { value: 'sad', label: 'Üzgün', emoji: '\ud83d\ude22' },
  { value: 'scared', label: 'Korkmuş', emoji: '\ud83d\ude28' },
  { value: 'confused', label: 'Kafası karışık', emoji: '\ud83d\ude15' },
  { value: 'neutral', label: 'Nötr', emoji: '\ud83d\ude10' },
]

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function DreamCalendarPage() {
  const { lang } = useParams()
  const { data: session } = useSession() || {}
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '', symbols: '', mood: 'neutral', lucidity: 3, analyzeWithAI: false })
  const [saving, setSaving] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([])
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchEntries()
      fetch('/api/weekly-dream-report').then(r => r.ok ? r.json() : []).then(data => setWeeklyReports(Array.isArray(data) ? data : [])).catch(() => {})
    }
    else setLoading(false)
  }, [session, month, year])

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dream-diary?month=${month}&year=${year}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!selectedDate || !formData.title || !formData.content) return
    setSaving(true)
    try {
      const res = await fetch('/api/dream-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamDate: selectedDate,
          title: formData.title,
          content: formData.content,
          symbols: formData.symbols.split(',').map((s: string) => s.trim()).filter(Boolean),
          mood: formData.mood,
          lucidity: formData.lucidity,
          analyzeWithAI: formData.analyzeWithAI,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormData({ title: '', content: '', symbols: '', mood: 'neutral', lucidity: 3, analyzeWithAI: false })
        fetchEntries()
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu rüya kaydını silmek istediğinize emin misiniz?')) return
    try {
      await fetch('/api/dream-diary', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      fetchEntries()
      setSelectedEntry(null)
    } catch (e) { console.error(e) }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const entryDates = new Set(entries.map((e: DiaryEntry) => new Date(e.dreamDate).getDate()))

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1) } else setMonth(month - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1) } else setMonth(month + 1) }

  if (!session?.user) {
    return (
      <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto text-center py-20">
        <Moon size={48} className="mx-auto mb-4 text-purple-400" />
        <h2 className="text-2xl font-bold text-white mb-2">Rüya Takviminiz</h2>
        <p className="text-white/60 mb-4">Rüyalarınızı günlük kaydedin, desenlerinizi keşfedin</p>
        <Link href={`/${lang}/login`} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors inline-block">
          Giriş Yapın
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full mb-4">
          <Calendar size={18} />
          <span>Rüya Takvimi</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Rüya Günlüğünüz</h1>
        <p className="text-white/60">Rüyalarınızı kaydedin, AI ile analiz edin, desenlerinizi keşfedin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-white/60 hover:text-white p-2"><ChevronLeft size={20} /></button>
            <h2 className="text-white font-semibold text-lg">{MONTHS_TR[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="text-white/60 hover:text-white p-2"><ChevronRight size={20} /></button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_TR.map(d => <div key={d} className="text-center text-white/40 text-xs font-medium py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const hasEntry = entryDates.has(day)
              const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === month && new Date().getFullYear() === year
              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDate(dateStr)
                    const entry = entries.find((e: DiaryEntry) => new Date(e.dreamDate).getDate() === day)
                    if (entry) { setSelectedEntry(entry); setShowForm(false) }
                    else { setSelectedEntry(null); setShowForm(true) }
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative ${
                    hasEntry ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  } ${isToday ? 'ring-2 ring-purple-500' : ''}`}
                >
                  {day}
                  {hasEntry && <Moon size={10} className="text-purple-400 mt-0.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
          {selectedEntry ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{selectedEntry.title}</h3>
                <button onClick={() => handleDelete(selectedEntry.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16} /></button>
              </div>
              <p className="text-white/40 text-xs mb-3">{new Date(selectedEntry.dreamDate).toLocaleDateString('tr-TR')}</p>
              {selectedEntry.mood && <p className="text-sm mb-2">Ruh hali: {MOODS.find(m => m.value === selectedEntry.mood)?.emoji} {MOODS.find(m => m.value === selectedEntry.mood)?.label}</p>}
              {selectedEntry.lucidity && <p className="text-sm text-white/60 mb-3">Berraklık: {'⭐'.repeat(selectedEntry.lucidity)}</p>}
              <p className="text-white/70 text-sm mb-4 whitespace-pre-wrap">{selectedEntry.content}</p>
              {selectedEntry.symbols?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedEntry.symbols.map((s: string) => <span key={s} className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs">{s}</span>)}
                </div>
              )}
              {selectedEntry.aiAnalysis && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mt-4">
                  <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold mb-2"><Brain size={14} /> AI Analizi</div>
                  <p className="text-white/70 text-sm">{selectedEntry.aiAnalysis}</p>
                </div>
              )}
            </div>
          ) : showForm ? (
            <div>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><PenLine size={16} /> Rüya Kaydet</h3>
              <p className="text-white/40 text-xs mb-3">{selectedDate}</p>
              <input
                type="text"
                placeholder="Rüya başlığı"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-purple-500/50"
              />
              <textarea
                placeholder="Rüyanızı anlatın..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 resize-none focus:outline-none focus:border-purple-500/50"
              />
              <input
                type="text"
                placeholder="Semboller (virgülle ayırın)"
                value={formData.symbols}
                onChange={(e) => setFormData({ ...formData, symbols: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-purple-500/50"
              />
              <div className="mb-3">
                <label className="text-white/60 text-xs mb-1 block">Ruh Hali</label>
                <div className="flex gap-2">
                  {MOODS.map(m => (
                    <button key={m.value} onClick={() => setFormData({ ...formData, mood: m.value })}
                      className={`px-2 py-1 rounded text-sm ${formData.mood === m.value ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60'}`}>
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="text-white/60 text-xs mb-1 block">Berraklık (1-5)</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setFormData({ ...formData, lucidity: n })}
                      className={`px-3 py-1 rounded text-sm ${formData.lucidity >= n ? 'bg-yellow-500/30 text-yellow-300' : 'bg-white/5 text-white/40'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/60 mb-4 cursor-pointer">
                <input type="checkbox" checked={formData.analyzeWithAI} onChange={(e) => setFormData({ ...formData, analyzeWithAI: e.target.checked })}
                  className="rounded bg-white/10 border-white/20" />
                <Brain size={14} /> AI ile analiz et
              </label>
              <button onClick={handleSave} disabled={saving || !formData.title || !formData.content}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Calendar size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Takvimden bir gün seçin</p>
              <p className="text-xs mt-1">Rüyanızı kaydedin veya geçmiş kayıtlarınızı görüntüleyin</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Dream Report */}
      {session?.user && (
        <div className="mt-6 bg-white/5 border border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-indigo-400" />
              <h3 className="text-white font-semibold">Haftalık Rüya Raporu</h3>
            </div>
            <button
              onClick={async () => {
                setGeneratingReport(true)
                try {
                  const res = await fetch('/api/weekly-dream-report', { method: 'POST' })
                  if (res.ok) {
                    const data = await res.json()
                    setWeeklyReports(prev => [data, ...prev.slice(0, 3)])
                  }
                } catch (e) { console.error(e) }
                finally { setGeneratingReport(false) }
              }}
              disabled={generatingReport}
              className="text-xs px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {generatingReport ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generatingReport ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
            </button>
          </div>
          {weeklyReports.length > 0 ? (
            <div className="space-y-3">
              {weeklyReports.map((report: WeeklyReport) => (
                <details key={report.id} className="group">
                  <summary className="cursor-pointer flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {new Date(report.weekStart).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} — {new Date(report.weekEnd).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-white/40 text-xs">{report.dreamCount} rüya • {(report.topSymbols || []).slice(0, 3).join(', ')}</p>
                    </div>
                    <ChevronDown size={14} className="text-white/40 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-2 p-3 bg-white/[0.02] rounded-lg text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {report.reportContent}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-4">Henüz haftalık rapor oluşturulmadı. Rüyalarınızı kaydedin ve AI raporunuzu alın!</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{entries.length}</p>
          <p className="text-white/40 text-xs">Bu Ay Rüya</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-indigo-400">{entries.filter((e: DiaryEntry) => e.aiAnalysis).length}</p>
          <p className="text-white/40 text-xs">AI Analizi</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-pink-400">{new Set(entries.flatMap((e: DiaryEntry) => e.symbols || [])).size}</p>
          <p className="text-white/40 text-xs">Farklı Sembol</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{entries.filter((e: DiaryEntry) => e.lucidity && e.lucidity >= 4).length}</p>
          <p className="text-white/40 text-xs">Berrak Rüya</p>
        </div>
      </div>
    </div>
  )
}
