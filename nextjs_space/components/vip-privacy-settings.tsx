'use client'

/**
 * BÖLÜM 20 — §11 Gizlilik sistemi kullanıcı arayüzü (§21 güvenlik notu).
 * Tüm yetki kararları sunucuda verilir: bu panel yalnızca /api/me/vip-preferences
 * uçlarının döndürdüğü `editable` haritasını gösterir. Kilitli bir alanı istemci
 * tarafında açmaya çalışmak sunucu tarafından reddedilir (403).
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Lock, Shield, Check, AlertCircle } from 'lucide-react'

type PrefKey =
  | 'hideVipBadge'
  | 'disableEntranceEffects'
  | 'muteOthersEntrance'
  | 'hideOnlineStatus'
  | 'hideLastSeen'
  | 'hideProfileVisit'
  | 'hiddenRoomEntry'
  | 'hideVipStatus'

const FIELDS: Array<{ key: PrefKey; label: string; desc: string }> = [
  { key: 'hideOnlineStatus', label: 'Çevrimiçi durumumu gizle', desc: 'Diğer kullanıcılar çevrimiçi olduğunuzu göremez.' },
  { key: 'hideLastSeen', label: 'Son görülmeyi gizle', desc: 'Profilinizde son aktif olma zamanı gösterilmez.' },
  { key: 'hideProfileVisit', label: 'Profil ziyaretimi gizle', desc: 'Bir profili ziyaret ettiğinizde iz bırakmazsınız.' },
  { key: 'hiddenRoomEntry', label: 'Odaya gizli giriş', desc: 'Sesli/görüntülü odalara giriş bildirimi yapılmaz.' },
  { key: 'hideVipStatus', label: 'VIP durumumu gizle', desc: 'Üyelik seviyeniz diğer kullanıcılara gösterilmez.' },
  { key: 'hideVipBadge', label: 'VIP rozetimi gizle', desc: 'İsminizin yanındaki üyelik rozeti görünmez.' },
  { key: 'disableEntranceEffects', label: 'Kendi giriş efektimi kapat', desc: 'Odaya girdiğinizde giriş animasyonu oynatılmaz.' },
  { key: 'muteOthersEntrance', label: 'Diğerlerinin giriş efektlerini kapat', desc: 'Başkalarının giriş animasyonlarını görmezsiniz.' },
]

export default function VipPrivacySettings({ isDark = true }: { isDark?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [editable, setEditable] = useState<Record<string, boolean>>({})
  const [tier, setTier] = useState<string>('')
  const [saving, setSaving] = useState<PrefKey | ''>('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [available, setAvailable] = useState(true)

  const textPrimary = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500'
  const cardBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const rowBg = isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/vip-preferences')
      if (!res.ok) {
        setAvailable(false)
        return
      }
      const json = await res.json()
      const d = json?.data ?? json
      setPrefs(d?.preferences || {})
      setEditable(d?.editable || {})
      setTier(d?.tier || '')
    } catch {
      setAvailable(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (key: PrefKey) => {
    if (editable[key] === false || saving) return
    const next = !prefs[key]
    const prev = prefs
    setPrefs({ ...prefs, [key]: next })
    setSaving(key)
    setMsg(null)
    try {
      const res = await fetch('/api/me/vip-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setPrefs(prev)
        setMsg({
          type: 'err',
          text:
            json?.error?.message ||
            json?.message ||
            (res.status === 429
              ? 'Çok fazla istek gönderildi, lütfen biraz bekleyin.'
              : 'Ayar kaydedilemedi.'),
        })
        return
      }
      const d = json?.data ?? json
      if (d?.preferences) setPrefs(d.preferences)
      setMsg({ type: 'ok', text: 'Gizlilik ayarınız kaydedildi.' })
    } catch {
      setPrefs(prev)
      setMsg({ type: 'err', text: 'Bağlantı hatası, ayar kaydedilemedi.' })
    } finally {
      setSaving('')
    }
  }

  if (!available) return null

  if (loading) {
    return (
      <div className={`rounded-2xl border p-6 flex items-center gap-3 ${cardBg}`}>
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <span className={`text-sm ${textMuted}`}>Gizlilik ayarları yükleniyor...</span>
      </div>
    )
  }

  const lockedCount = FIELDS.filter((f) => editable[f.key] === false).length

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${cardBg}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold ${textPrimary}`}>Gizlilik Ayarları</h3>
          <p className={`text-xs mt-0.5 ${textMuted}`}>
            {tier ? `Mevcut seviyeniz: ${tier.toUpperCase()}. ` : ''}
            Ayarlar anında kaydedilir ve tüm cihazlarınızda geçerli olur.
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
            msg.type === 'ok'
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}
        >
          {msg.type === 'ok' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1">{msg.text}</span>
        </div>
      )}

      <div className="space-y-2">
        {FIELDS.map((f) => {
          const locked = editable[f.key] === false
          const on = !!prefs[f.key]
          return (
            <div
              key={f.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-opacity ${rowBg} ${
                locked ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${textPrimary}`}>{f.label}</span>
                  {locked && <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                </div>
                <p className={`text-xs mt-0.5 ${textMuted}`}>
                  {locked ? 'Bu ayar mevcut üyelik seviyenizde kullanılamıyor.' : f.desc}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={f.label}
                disabled={locked || saving === f.key}
                onClick={() => toggle(f.key)}
                className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${
                  locked
                    ? 'cursor-not-allowed bg-gray-500/30'
                    : on
                    ? 'bg-purple-500'
                    : isDark
                    ? 'bg-white/15'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${
                    on ? 'left-6' : 'left-1'
                  }`}
                >
                  {saving === f.key && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {lockedCount > 0 && (
        <p className={`text-xs mt-4 ${textMuted}`}>
          <Lock className="w-3 h-3 inline mr-1 text-amber-400" />
          {lockedCount} ayar daha üst bir üyelik seviyesinde açılır.
        </p>
      )}
    </div>
  )
}
