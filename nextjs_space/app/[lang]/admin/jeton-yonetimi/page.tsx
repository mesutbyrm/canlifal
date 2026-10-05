'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCriticalConfirm } from '@/components/admin/critical-confirm-dialog'
import {
  Loader2, Coins, Percent, Package, Inbox, History, Wallet,
  Settings2, Check, X, Save, RefreshCw, Search, BarChart3,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Tipler                                                             */
/* ------------------------------------------------------------------ */
interface Pricing {
  jetonUnitPrice: number
  cfcUnitPrice: number
  discountEnabled: boolean
  discountPercent: number
  topupBonusEnabled: boolean
  withdrawalTaxPercent: number
}

interface Sample {
  jeton: number
  basePrice: number
  finalPrice: number
}

interface Notif {
  id: string
  userId: string
  username: string | null
  paymentMethod: string | null
  amount: number
  requestedAmount: number | null
  jetonLoaded: number | null
  cfcLoaded: number | null
  productType: string | null
  status: string
  notes: string | null
  createdAt: string
  processedAt: string | null
  statusLabel?: string
  transactionTypeLabel?: string
  transactionTypeIcon?: string
  unitPrice?: number
  expectedAmountTRY?: number
  amountMatchesUnitPrice?: boolean
}

interface Pkg {
  id: string
  name: string
  credits: number
  price: number
  bonusCredits: number
  isActive: boolean
  sortOrder: number
}

interface StatBlock {
  pending: number
  approved: number
  rejected: number
  revenueTRY: number
  unitsSold: number
}

const TL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(n) || 0)

const TABS = [
  { key: 'fiyat', label: 'Jeton Fiyatı & Ayarlar', icon: Percent },
  { key: 'paketler', label: 'Paketler', icon: Package },
  { key: 'basvurular', label: 'Ödeme Başvuruları', icon: Inbox },
  { key: 'gecmis', label: 'İşlem Geçmişi', icon: History },
  { key: 'manuel', label: 'Bakiye & Manuel İşlem', icon: Wallet },
  { key: 'rapor', label: 'Raporlar', icon: BarChart3 },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AdminJetonYonetimiPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { postJson, confirmDialog } = useCriticalConfirm()

  const [tab, setTab] = useState<TabKey>('fiyat')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Fiyat
  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [savingPricing, setSavingPricing] = useState(false)

  // Paketler
  const [packages, setPackages] = useState<Pkg[]>([])

  // Başvurular
  const [typeFilter, setTypeFilter] = useState<'all' | 'jeton' | 'cfc'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [actingId, setActingId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})

  // Manuel
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [selUser, setSelUser] = useState<any>(null)
  const [manualType, setManualType] = useState<'jeton' | 'cfc'>('jeton')
  const [manualAmount, setManualAmount] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualBusy, setManualBusy] = useState(false)

  // Rapor
  const [stats, setStats] = useState<any>(null)

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  /* -------------------------------------------------------------- */
  const loadPricing = useCallback(async () => {
    const r = await fetch('/api/admin/jeton-pricing', { cache: 'no-store' })
    if (r.status === 403) { flash('err', 'Bu bölüm için yetkiniz yok (403)'); return }
    const d = await r.json()
    if (d?.pricing) setPricing(d.pricing)
    if (d?.samples) setSamples(d.samples)
  }, [])

  const loadPackages = useCallback(async () => {
    const r = await fetch('/api/admin/credit-packages', { cache: 'no-store' })
    if (r.ok) setPackages(await r.json())
  }, [])

  const loadNotifs = useCallback(async () => {
    const qs = new URLSearchParams({ limit: '50' })
    if (typeFilter !== 'all') qs.set('productType', typeFilter)
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    const r = await fetch(`/api/admin/payments?${qs}`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      setNotifs(d?.data?.notifications || d?.notifications || [])
    }
  }, [typeFilter, statusFilter])

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/admin/payments?view=stats', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      setStats(d?.data || d)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    const role = (session?.user as any)?.role
    if (!session?.user || !['admin', 'yonetici', 'finans'].includes(role)) {
      router.push('/giris')
      return
    }
    ;(async () => {
      setLoading(true)
      await Promise.all([loadPricing(), loadPackages(), loadStats()])
      setLoading(false)
    })()
  }, [session, status, router, loadPricing, loadPackages, loadStats])

  useEffect(() => {
    if (tab === 'basvurular' || tab === 'gecmis') loadNotifs()
  }, [tab, loadNotifs])

  /* -------------------------------------------------------------- */
  const savePricing = async () => {
    if (!pricing) return
    setSavingPricing(true)
    try {
      const r = await fetch('/api/admin/jeton-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricing),
      })
      const d = await r.json()
      if (!r.ok) { flash('err', d?.error || `Kaydedilemedi (${r.status})`); return }
      if (d?.pricing) setPricing(d.pricing)
      if (d?.samples) setSamples(d.samples)
      flash('ok', 'Fiyat ve ayarlar kaydedildi.')
    } finally {
      setSavingPricing(false)
    }
  }

  const actOnNotif = async (n: Notif, action: 'approve' | 'reject') => {
    setActingId(n.id)
    try {
      const res = await postJson('/api/admin/payments', {
        action,
        notificationId: n.id,
        adminNote: noteDraft[n.id] || undefined,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { flash('err', d?.error || `İşlem başarısız (${res.status})`); return }
      flash('ok', action === 'approve' ? 'Ödeme onaylandı ve bakiye yüklendi.' : 'Ödeme reddedildi (bakiye yüklenmedi).')
      await Promise.all([loadNotifs(), loadStats()])
    } finally {
      setActingId(null)
    }
  }

  const searchUsers = async (q: string) => {
    setUserQuery(q)
    if (q.trim().length < 2) { setUserResults([]); return }
    const r = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=8`, { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      setUserResults(d?.users || d?.data?.users || [])
    }
  }

  const submitManual = async () => {
    if (!selUser) { flash('err', 'Önce kullanıcı seçin'); return }
    const amt = parseInt(manualAmount)
    if (!amt) { flash('err', 'Miktar 0 olamaz (pozitif = ekle, negatif = çıkar)'); return }
    setManualBusy(true)
    try {
      const res = await postJson('/api/admin/payments', {
        action: 'manual_load',
        userId: selUser.id,
        productType: manualType,
        amount: amt,
        reason: manualReason || undefined,
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { flash('err', d?.error || `İşlem başarısız (${res.status})`); return }
      flash('ok', d?.data?.message || d?.message || 'İşlem tamamlandı.')
      setManualAmount(''); setManualReason('')
      await searchUsers(userQuery)
    } finally {
      setManualBusy(false)
    }
  }

  const togglePackage = async (p: Pkg) => {
    const r = await fetch(`/api/admin/credit-packages/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (r.ok) { flash('ok', 'Paket güncellendi.'); loadPackages() }
    else flash('err', 'Paket güncellenemedi.')
  }

  /* -------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const unit = pricing?.jetonUnitPrice ?? 0.5

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {confirmDialog}

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Coins className="w-8 h-8 text-amber-500" />
          Jeton Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Jeton fiyatı, paketler, indirim ayarları, ödeme başvuruları ve manuel bakiye işlemleri tek yerde.
        </p>
      </header>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {/* Özet şerit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Birim Jeton Fiyatı</p>
          <p className="text-xl font-bold text-amber-500">{TL(unit)}</p>
        </div>
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">10.000 Jeton</p>
          <p className="text-xl font-bold">{TL(10000 * unit)}</p>
        </div>
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">İndirim</p>
          <p className="text-xl font-bold">{pricing?.discountEnabled ? `%${pricing.discountPercent}` : 'Kapalı'}</p>
        </div>
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Bekleyen Başvuru</p>
          <p className="text-xl font-bold">{stats?.counts?.pending ?? 0}</p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.key ? 'bg-amber-500 text-white shadow' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- Fiyat & Ayarlar ---------------- */}
      {tab === 'fiyat' && pricing && (
        <section className="space-y-6">
          <div className="rounded-2xl bg-card border p-5 shadow-sm space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Fiyat Ayarları</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-muted-foreground">1 Jeton kaç TL?</span>
                <input
                  type="number" step="0.01" min="0.01"
                  value={pricing.jetonUnitPrice}
                  onChange={(e) => setPricing({ ...pricing, jetonUnitPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">1 CFC kaç TL?</span>
                <input
                  type="number" step="0.01" min="0.01"
                  value={pricing.cfcUnitPrice}
                  onChange={(e) => setPricing({ ...pricing, cfcUnitPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted-foreground">Para çekim vergi kesintisi (%)</span>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={pricing.withdrawalTaxPercent}
                  onChange={(e) => setPricing({ ...pricing, withdrawalTaxPercent: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                />
                <span className="text-xs text-muted-foreground">Kullanıcı çekim yaparken bu oran kesilir, kalan tutar bildirilir.</span>
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-card border p-5 shadow-sm space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Percent className="w-4 h-4" /> İndirim / Kampanya Ayarları</h2>
            <p className="text-xs text-muted-foreground">
              Varsayılan olarak <b>kapalıdır</b>. Kapalıyken hiçbir üyelik seviyesi (Gold, Premium, Diamond, SVIP) fiyatı değiştiremez.
            </p>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pricing.discountEnabled}
                onChange={(e) => setPricing({ ...pricing, discountEnabled: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm">İndirim sistemi aktif</span>
            </label>
            <label className="block max-w-xs">
              <span className="text-sm text-muted-foreground">İndirim yüzdesi (%)</span>
              <input
                type="number" step="1" min="0" max="90"
                disabled={!pricing.discountEnabled}
                value={pricing.discountPercent}
                onChange={(e) => setPricing({ ...pricing, discountPercent: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 disabled:opacity-50"
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={pricing.topupBonusEnabled}
                onChange={(e) => setPricing({ ...pricing, topupBonusEnabled: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm">Otomatik yükleme bonusu aktif (kademeli bonus jeton)</span>
            </label>
          </div>

          <div className="rounded-2xl bg-card border p-5 shadow-sm">
            <h2 className="font-semibold mb-3">Canlı Fiyat Önizleme</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Jeton</th>
                  <th className="py-2">Liste Fiyatı</th>
                  <th className="py-2">Ödenecek Tutar</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.jeton} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.jeton.toLocaleString('tr-TR')}</td>
                    <td className="py-2">{TL(s.basePrice)}</td>
                    <td className="py-2 font-bold text-amber-500">{TL(s.finalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={savePricing}
            disabled={savingPricing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60"
          >
            {savingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </section>
      )}

      {/* ---------------- Paketler ---------------- */}
      {tab === 'paketler' && (
        <section className="rounded-2xl bg-card border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Jeton Paketleri</h2>
            <button onClick={loadPackages} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-4 h-4" /> Yenile
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Paket</th>
                  <th className="py-2">Jeton</th>
                  <th className="py-2">Fiyat</th>
                  <th className="py-2">Birim</th>
                  <th className="py-2">Bonus</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => {
                  const expected = p.credits * unit
                  const mismatch = Math.abs(expected - p.price) > 0.01
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{p.name}</td>
                      <td className="py-2">{p.credits.toLocaleString('tr-TR')}</td>
                      <td className={`py-2 ${mismatch ? 'text-red-500 font-semibold' : ''}`}>{TL(p.price)}</td>
                      <td className="py-2 text-muted-foreground">{TL(p.credits ? p.price / p.credits : 0)}</td>
                      <td className="py-2">{p.bonusCredits || 0}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                          {p.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => togglePackage(p)} className="text-xs px-3 py-1 rounded-lg border hover:bg-muted">
                          {p.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Kırmızı fiyatlar, güncel birim fiyat ({TL(unit)}) ile uyuşmayan paketleri gösterir.
          </p>
        </section>
      )}

      {/* ---------------- Başvurular / Geçmiş ---------------- */}
      {(tab === 'basvurular' || tab === 'gecmis') && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([['all', 'Tümü'], ['jeton', '🪙 Jeton Ödemeleri'], ['cfc', '💰 CFC Ödemeleri']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTypeFilter(k as any)}
                className={`px-3 py-1.5 rounded-lg text-sm ${typeFilter === k ? 'bg-amber-500 text-white' : 'bg-muted'}`}>{l}</button>
            ))}
            <span className="w-px bg-border mx-1" />
            {([['all', 'Tümü'], ['pending', 'Bekleyen'], ['approved', 'Onaylanan'], ['rejected', 'Reddedilen']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setStatusFilter(k as any)}
                className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === k ? 'bg-foreground text-background' : 'bg-muted'}`}>{l}</button>
            ))}
          </div>

          {notifs.length === 0 && (
            <div className="rounded-2xl bg-card border p-8 text-center text-muted-foreground">Kayıt bulunamadı.</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {notifs.map((n) => {
              const isCfc = n.productType === 'cfc'
              const qty = isCfc ? n.cfcLoaded ?? n.requestedAmount : n.jetonLoaded ?? n.requestedAmount
              return (
                <div key={n.id} className="rounded-2xl bg-card border shadow-sm overflow-hidden">
                  <div className={`px-4 py-2 text-sm font-semibold ${isCfc ? 'bg-purple-500/10 text-purple-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {n.transactionTypeIcon || (isCfc ? '💰' : '🪙')} {n.transactionTypeLabel || (isCfc ? 'CFC ÖDEMESİ' : 'JETON ÖDEMESİ')}
                  </div>
                  <div className="p-4 space-y-1.5 text-sm">
                    <Row l="Kullanıcı" v={n.username || n.userId} />
                    <Row l="Tarih" v={new Date(n.createdAt).toLocaleString('tr-TR')} />
                    <Row l="İşlem Türü" v={n.transactionTypeLabel || (isCfc ? 'CFC ÖDEMESİ' : 'JETON ÖDEMESİ')} />
                    <Row l={isCfc ? 'Talep Edilen CFC' : 'Talep Edilen Jeton'} v={(qty ?? 0).toLocaleString('tr-TR')} />
                    <Row l="Ödenecek Tutar" v={TL(n.amount)} />
                    <Row l="Birim Fiyat" v={TL(n.unitPrice ?? (isCfc ? pricing?.cfcUnitPrice ?? 1 : unit))} />
                    <Row l="Ödeme Yöntemi" v={n.paymentMethod || '—'} />
                    <Row l="Durum" v={n.statusLabel || n.status} />
                    {n.notes && <Row l="Not" v={n.notes} />}
                    {n.amountMatchesUnitPrice === false && (
                      <p className="text-xs text-red-500">
                        ⚠ Tutar birim fiyatla uyuşmuyor. Beklenen: {TL(n.expectedAmountTRY || 0)}
                      </p>
                    )}
                  </div>
                  {n.status === 'pending' && (
                    <div className="p-4 pt-0 space-y-2">
                      <input
                        placeholder="Yönetici notu (opsiyonel)"
                        value={noteDraft[n.id] || ''}
                        onChange={(e) => setNoteDraft({ ...noteDraft, [n.id]: e.target.value })}
                        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={actingId === n.id}
                          onClick={() => actOnNotif(n, 'approve')}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {actingId === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} ONAYLA
                        </button>
                        <button
                          disabled={actingId === n.id}
                          onClick={() => actOnNotif(n, 'reject')}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
                        >
                          <X className="w-4 h-4" /> REDDET
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ---------------- Manuel ---------------- */}
      {tab === 'manuel' && (
        <section className="rounded-2xl bg-card border p-5 shadow-sm space-y-4 max-w-2xl">
          <h2 className="font-semibold">Bakiye Kontrolü & Manuel Jeton Ekleme / Çıkarma</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              placeholder="Kullanıcı adı veya e-posta ara…"
              value={userQuery}
              onChange={(e) => searchUsers(e.target.value)}
              className="w-full rounded-xl border bg-background pl-9 pr-3 py-2"
            />
          </div>
          {userResults.length > 0 && (
            <div className="rounded-xl border divide-y max-h-64 overflow-y-auto">
              {userResults.map((u) => (
                <button key={u.id} onClick={() => { setSelUser(u); setUserResults([]) }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                  <span className="font-medium">{u.username || u.name}</span>
                  <span className="text-muted-foreground"> · {u.email}</span>
                </button>
              ))}
            </div>
          )}
          {selUser && (
            <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
              <p className="font-semibold">{selUser.username || selUser.name}</p>
              <Row l="Jeton Bakiyesi" v={(selUser.jetonBalance ?? 0).toLocaleString('tr-TR')} />
              <Row l="CFC Bakiyesi" v={(selUser.cfcBalance ?? 0).toLocaleString('tr-TR')} />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <select value={manualType} onChange={(e) => setManualType(e.target.value as any)}
              className="rounded-xl border bg-background px-3 py-2">
              <option value="jeton">Jeton</option>
              <option value="cfc">CFC</option>
            </select>
            <input type="number" placeholder="Miktar (negatif = çıkar)" value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="rounded-xl border bg-background px-3 py-2" />
          </div>
          <input placeholder="Açıklama / gerekçe" value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2" />
          <button onClick={submitManual} disabled={manualBusy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60">
            {manualBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />} Uygula
          </button>
        </section>
      )}

      {/* ---------------- Rapor ---------------- */}
      {tab === 'rapor' && stats && (
        <section className="space-y-5">
          <p className="text-sm text-muted-foreground">Jeton ve CFC istatistikleri birbirine karıştırılmadan ayrı raporlanır.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <StatCard title="🪙 Jeton Ödemeleri" block={stats.jeton} unitLabel="Jeton" />
            <StatCard title="💰 CFC Ödemeleri" block={stats.cfc} unitLabel="CFC" />
          </div>
          <div className="rounded-2xl bg-card border p-5 shadow-sm text-sm space-y-1">
            <h3 className="font-semibold mb-2">Genel</h3>
            <Row l="Bekleyen" v={stats.counts?.pending ?? 0} />
            <Row l="Onaylanan" v={stats.counts?.approved ?? 0} />
            <Row l="Reddedilen" v={stats.counts?.rejected ?? 0} />
            <Row l="Toplam Tahsilat" v={TL(stats.totals?.amountTRY || 0)} />
          </div>
        </section>
      )}
    </div>
  )
}

function Row({ l, v }: { l: string; v: any }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{l}</span>
      <span className="font-medium text-right break-words">{v}</span>
    </div>
  )
}

function StatCard({ title, block, unitLabel }: { title: string; block?: StatBlock; unitLabel: string }) {
  return (
    <div className="rounded-2xl bg-card border p-5 shadow-sm text-sm space-y-1">
      <h3 className="font-semibold mb-2">{title}</h3>
      <Row l="Bekleyen" v={block?.pending ?? 0} />
      <Row l="Onaylanan" v={block?.approved ?? 0} />
      <Row l="Reddedilen" v={block?.rejected ?? 0} />
      <Row l="Toplam Gelir" v={TL(block?.revenueTRY || 0)} />
      <Row l={`Satılan ${unitLabel}`} v={(block?.unitsSold ?? 0).toLocaleString('tr-TR')} />
    </div>
  )
}
