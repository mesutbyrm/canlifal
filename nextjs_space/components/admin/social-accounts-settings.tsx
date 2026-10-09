'use client'

import { useEffect, useState } from 'react'
import { Check, ExternalLink, Loader2, Save } from 'lucide-react'

type Row = { platform: string; label: string; value: string; enabled: boolean; url?: string }

const PLATFORMS: { id: string; label: string; hint: string }[] = [
  { id: 'instagram', label: 'Instagram', hint: '@canlifal veya https://instagram.com/…' },
  { id: 'tiktok', label: 'TikTok', hint: '@canlifal veya bağlantı' },
  { id: 'youtube', label: 'YouTube', hint: '@kanal veya bağlantı' },
  { id: 'x', label: 'X (Twitter)', hint: '@kullanici veya bağlantı' },
  { id: 'facebook', label: 'Facebook', hint: 'sayfa adı veya bağlantı' },
  { id: 'telegram', label: 'Telegram', hint: 'kanal adı veya bağlantı' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'telefon (905xx…) veya bağlantı' },
  { id: 'website', label: 'Web sitesi', hint: 'https://…' },
]

/** Admin ayarlar — sitenin resmi sosyal medya hesapları (/api/admin/social-accounts). */
export default function SocialAccountsSettings() {
  const [rows, setRows] = useState<Row[]>(
    PLATFORMS.map((p) => ({ platform: p.id, label: p.label, value: '', enabled: true }))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/social-accounts')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list: any[] = Array.isArray(data?.accounts) ? data.accounts : []
        setRows((prev) =>
          prev.map((row) => {
            const hit = list.find((a) => a.platform === row.platform)
            return hit ? { ...row, value: hit.value ?? '', enabled: hit.enabled !== false, url: hit.url } : row
          })
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/social-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: rows.map(({ platform, value, enabled }) => ({ platform, value, enabled })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Kaydedilemedi')
        return
      }
      const list: any[] = Array.isArray(data?.accounts) ? data.accounts : []
      setRows((prev) =>
        prev.map((row) => {
          const hit = list.find((a) => a.platform === row.platform)
          return { ...row, url: hit?.url }
        })
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-8 bg-gradient-to-br from-deep-purple-900/50 to-deep-purple-950/50 rounded-xl border border-purple-500/20 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
          <span className="text-2xl">📱</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Sosyal Medya Hesapları</h3>
          <p className="text-sm text-purple-400">
            Kullanıcı adı veya bağlantı girin. Boş bırakılan hesap gösterilmez. Mobil uygulamada ve sitede görünür.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-purple-300 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => {
            const meta = PLATFORMS.find((p) => p.id === row.platform)
            return (
              <div key={row.platform} className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto_auto] gap-2 items-center">
                <label className="text-sm text-purple-200">{row.label}</label>
                <input
                  type="text"
                  value={row.value}
                  placeholder={meta?.hint}
                  maxLength={200}
                  onChange={(e) =>
                    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                  }
                  className="w-full px-3 py-2 bg-deep-purple-950/60 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-purple-400"
                />
                <label className="flex items-center gap-1 text-xs text-purple-300">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, j) => (j === i ? { ...r, enabled: e.target.checked } : r)))
                    }
                  />
                  Göster
                </label>
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-white">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="w-4" />
                )}
              </div>
            )
          })}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Kaydedildi' : 'Sosyal Medyayı Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
