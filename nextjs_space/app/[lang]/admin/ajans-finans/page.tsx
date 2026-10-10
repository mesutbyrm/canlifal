'use client'

import { useEffect, useState, useCallback } from 'react'

type Rule = { sourceType: string; enabled: boolean; rate: number | null; scope: string }

const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n || 0))

export default function AjansFinansPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<'settings' | 'wallets' | 'commission'>('settings')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // düzenlenebilir state
  const [rate, setRate] = useState('')
  const [walletEnabled, setWalletEnabled] = useState(true)
  const [minTopUp, setMinTopUp] = useState('0')
  const [maxTransfer, setMaxTransfer] = useState('0')
  const [purchaseDiscount, setPurchaseDiscount] = useState('0')
  const [purchaseMin, setPurchaseMin] = useState('1000')
  const [purchaseDailyMax, setPurchaseDailyMax] = useState('0')
  const [dailyTransfer, setDailyTransfer] = useState('0')
  const [purchaseEnabled, setPurchaseEnabled] = useState(true)
  const [uses, setUses] = useState<string[]>([])
  const [bonus, setBonus] = useState<any[]>([])
  const [globalRules, setGlobalRules] = useState<Rule[]>([])

  // cüzdan detay
  const [selected, setSelected] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [wLoading, setWLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/agency-finance', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j?.error?.message || 'Yüklenemedi')
      setData(j.data)
      setRate(String(j.data.settings.tl_to_jeton_rate))
      setWalletEnabled(j.data.settings.wallet_enabled)
      setMinTopUp(String(j.data.settings.min_topup_tl))
      setMaxTransfer(String(j.data.settings.max_transfer_per_txn))
      setPurchaseDiscount(String(j.data.settings.purchase_discount_pct ?? 0))
      setPurchaseMin(String(j.data.settings.purchase_min_jeton ?? 1000))
      setPurchaseDailyMax(String(j.data.settings.purchase_daily_max_jeton ?? 0))
      setDailyTransfer(String(j.data.settings.daily_transfer_limit ?? 0))
      setPurchaseEnabled(j.data.settings.purchase_enabled !== false)
      setUses(j.data.settings.allowed_uses || [])
      setBonus(j.data.bonus_rules || [])
      setGlobalRules(j.data.global_commission_rules || [])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const r = await fetch('/api/admin/agency-finance', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            tl_to_jeton_rate: rate, wallet_enabled: walletEnabled,
            min_topup_tl: minTopUp, max_transfer_per_txn: maxTransfer, allowed_uses: uses,
            purchase_discount_pct: purchaseDiscount, purchase_min_jeton: purchaseMin, purchase_enabled: purchaseEnabled,
            purchase_daily_max_jeton: purchaseDailyMax, daily_transfer_limit: dailyTransfer,
          },
          bonus_rules: bonus,
          global_commission_rules: globalRules,
        }),
      })
      const j = await r.json()
      if (!r.ok || !j.success) throw new Error(j?.error?.message || 'Kaydedilemedi')
      setMsg('Ayarlar kaydedildi')
      load()
    } catch (e: any) { setMsg('Hata: ' + e.message) } finally { setSaving(false) }
  }

  const openWallet = async (agency: any) => {
    setSelected(agency); setWallet(null); setWLoading(true)
    try {
      const r = await fetch(`/api/admin/agencies/${agency.id}/wallet?limit=30`, { cache: 'no-store' })
      const j = await r.json()
      if (j.success) setWallet(j.data)
    } finally { setWLoading(false) }
  }

  const walletAction = async (action: string, extra: any = {}) => {
    if (!selected) return
    const reason = window.prompt('Gerekçe (zorunlu):') || ''
    if (['topup', 'adjust'].includes(action) && !reason.trim()) return
    let r = await fetch(`/api/admin/agencies/${selected.id}/wallet`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, ...extra }),
    })
    let j = await r.json()
    if (r.status === 409 && j?.requiresConfirmation) {
      if (!window.confirm(j.confirmationMessage)) return
      r = await fetch(`/api/admin/agencies/${selected.id}/wallet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, confirm: true, ...extra }),
      })
      j = await r.json()
    }
    setMsg(j?.message || j?.error?.message || '')
    openWallet(selected); load()
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor…</div>
  if (err) return <div className="p-8 text-red-400">{err}</div>

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-400">💼 Ajans Finans Merkezi</h1>
        <p className="text-sm text-gray-400 mt-1">
          Ajans cüzdanı, bonus oranları ve gelir kaynağı bazlı komisyon kuralları. Ajans bakiyesi nakde çevrilemez.
        </p>
      </div>

      {msg && <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-2 text-sm text-amber-300">{msg}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Toplam ajans bakiyesi', v: data.totals.balance },
          { l: 'Toplam yükleme', v: data.totals.topup },
          { l: 'Toplam bonus', v: data.totals.bonus },
          { l: 'Üyelere aktarılan', v: data.totals.transferred },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-400">{k.l}</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{fmt(k.v)}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-gray-800">
        {([['settings', 'Global Ayarlar'], ['wallets', 'Ajans Cüzdanları'], ['commission', 'Komisyon Kuralları']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === k ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
            <h2 className="font-semibold text-gray-100">Cüzdan Ayarları</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-sm text-gray-300">
                TL → jeton kuru (1 TL = ? jeton)
                <input value={rate} onChange={(e) => setRate(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
                <span className="text-xs text-gray-500">Kaynak: {data.settings.tl_to_jeton_rate_source === 'setting' ? 'admin ayarı' : 'mevcut jeton paketlerinden türetildi'}</span>
              </label>
              <label className="text-sm text-gray-300">
                Minimum yükleme (TL)
                <input value={minTopUp} onChange={(e) => setMinTopUp(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
              </label>
              <label className="text-sm text-gray-300">
                Tek işlemde maks. transfer (0 = sınırsız)
                <input value={maxTransfer} onChange={(e) => setMaxTransfer(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 mt-6">
                <input type="checkbox" checked={walletEnabled} onChange={(e) => setWalletEnabled(e.target.checked)} />
                Ajans cüzdanı aktif
              </label>
              <label className="text-sm text-gray-300">
                Toplu Jeton alım indirimi — varsayılan (%)
                <input value={purchaseDiscount} onChange={(e) => setPurchaseDiscount(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
                <span className="block text-xs text-gray-500 mt-1">Ajansa özel oran yoksa geçerli. Ajans, normal fiyatın bu kadar altında öder; cüzdana aldığı Jetonun tamamı yüklenir (bonus eklenmez).</span>
              </label>
              <label className="text-sm text-gray-300">
                Toplu alımda en az Jeton
                <input value={purchaseMin} onChange={(e) => setPurchaseMin(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
              </label>
              <label className="text-sm text-gray-300">
                Toplu alım — ajans başına günlük en fazla Jeton (0 = sınırsız)
                <input value={purchaseDailyMax} onChange={(e) => setPurchaseDailyMax(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
              </label>
              <label className="text-sm text-gray-300">
                Ajans → kullanıcı günlük toplam aktarım (Jeton, 0 = sınırsız)
                <input value={dailyTransfer} onChange={(e) => setDailyTransfer(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100" />
                <span className="block text-xs text-gray-500 mt-1">Ajansa özel değer Komisyon sekmesinden verilebilir.</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 mt-6">
                <input type="checkbox" checked={purchaseEnabled} onChange={(e) => setPurchaseEnabled(e.target.checked)} />
                Ajans toplu Jeton alımı açık
              </label>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-2">İzin verilen kullanım türleri</div>
              <div className="space-y-2">
                {data.catalog.uses.map((u: any) => (
                  <label key={u.key} className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={uses.includes(u.key)}
                      onChange={(e) => setUses(e.target.checked ? [...uses, u.key] : uses.filter((x) => x !== u.key))} />
                    {u.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Nakit ödeme, nakit çekme ve komisyonun nakde çevrilmesi hiçbir koşulda mümkün değildir.</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="font-semibold text-gray-100 mb-3">Ajans Seviyesi Bonus Oranları</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 text-xs">
                  <tr><th className="text-left py-2">Seviye</th><th className="text-left">Bonus %</th><th className="text-left">Min. aylık kazanç</th><th className="text-left">Min. aktif yayıncı</th><th className="text-left">Min. yayın dk</th><th className="text-left">Aktif</th></tr>
                </thead>
                <tbody>
                  {bonus.map((b: any, i: number) => (
                    <tr key={b.level} className="border-t border-gray-800">
                      <td className="py-2 text-gray-200">{b.label}</td>
                      {(['bonusRate', 'minMonthlyEarning', 'minActiveBroadcasters', 'minStreamMinutes'] as const).map((f) => (
                        <td key={f}>
                          <input value={b[f] ?? 0}
                            onChange={(e) => { const n = [...bonus]; n[i] = { ...b, [f]: e.target.value }; setBonus(n) }}
                            className="w-24 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100" />
                        </td>
                      ))}
                      <td>
                        <input type="checkbox" checked={b.isActive !== false}
                          onChange={(e) => { const n = [...bonus]; n[i] = { ...b, isActive: e.target.checked }; setBonus(n) }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="font-semibold text-gray-100 mb-1">Global Komisyon Kuralları</h2>
            <p className="text-xs text-gray-500 mb-3">Oran boş bırakılırsa ajansın kendi komisyon oranı uygulanır. Canlı falcı geliri varsayılan olarak kapalıdır.</p>
            <div className="space-y-2">
              {globalRules.map((r, i) => {
                const label = data.catalog.sources.find((s: any) => s.key === r.sourceType)?.label || r.sourceType
                return (
                  <div key={r.sourceType} className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-200 min-w-[220px]">
                      <input type="checkbox" checked={r.enabled}
                        onChange={(e) => { const n = [...globalRules]; n[i] = { ...r, enabled: e.target.checked }; setGlobalRules(n) }} />
                      {label}
                    </label>
                    <input placeholder="oran %" value={r.rate ?? ''}
                      onChange={(e) => { const n = [...globalRules]; n[i] = { ...r, rate: e.target.value === '' ? null : (e.target.value as any) }; setGlobalRules(n) }}
                      className="w-28 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100 text-sm" />
                    <span className="text-xs text-gray-500">kapsam: {r.scope}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-5 py-2 font-medium text-black">
            {saving ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
          </button>
        </div>
      )}

      {tab === 'wallets' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="font-semibold text-gray-100 mb-3">Ajanslar</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {data.agencies.map((a: any) => (
                <button key={a.id} onClick={() => openWallet(a)}
                  className={`w-full text-left rounded-lg border px-3 py-2 ${selected?.id === a.id ? 'border-amber-600 bg-amber-900/10' : 'border-gray-800 hover:border-gray-700'}`}>
                  <div className="flex justify-between items-center">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <div className="text-gray-100 text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-gray-500">{a.ownerName} · {a.level} · {a.status}</div>
                    </div>
                    <div className="text-amber-400 font-semibold text-sm">{fmt(a.wallet?.jetonBalance || 0)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            {!selected && <div className="text-gray-500 text-sm">Soldan bir ajans seçin.</div>}
            {selected && wLoading && <div className="text-gray-400 text-sm">Yükleniyor…</div>}
            {selected && wallet && (
              <div className="space-y-4">
                <div>
                  <div className="text-gray-100 font-semibold">{wallet.agency.name}</div>
                  <div className="text-xs text-gray-500">Kur: 1 TL = {wallet.rate} jeton · Bonus: %{wallet.bonus_rate} · Seviye: {wallet.agency.level}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3"><div className="text-xs text-gray-500">Bakiye</div><div className="text-amber-400 font-bold">{fmt(wallet.wallet.jetonBalance)}</div></div>
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3"><div className="text-xs text-gray-500">Kullanılan</div><div className="text-gray-200 font-bold">{fmt(wallet.wallet.totalTransferred)}</div></div>
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3"><div className="text-xs text-gray-500">Yükleme</div><div className="text-gray-200">{fmt(wallet.wallet.totalTopUp)}</div></div>
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3"><div className="text-xs text-gray-500">Bonus</div><div className="text-gray-200">{fmt(wallet.wallet.totalBonus)}</div></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { const v = window.prompt('Yüklenecek TL tutarı:'); if (v) walletAction('topup', { tlAmount: v }) }}
                    className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-sm text-white">TL Yükle</button>
                  <button onClick={() => { const v = window.prompt('Yüklenecek jeton (bonus uygulanır):'); if (v) walletAction('topup', { jetonAmount: v }) }}
                    className="rounded-lg bg-emerald-800 hover:bg-emerald-700 px-3 py-1.5 text-sm text-white">Jeton Yükle</button>
                  <button onClick={() => { const v = window.prompt('Düzeltme miktarı (+/-):'); if (v) walletAction('adjust', { amount: v }) }}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-sm text-white">Düzeltme</button>
                  <button onClick={() => walletAction(wallet.wallet.isLocked ? 'unlock' : 'lock')}
                    className="rounded-lg bg-red-800 hover:bg-red-700 px-3 py-1.5 text-sm text-white">{wallet.wallet.isLocked ? 'Kilidi Aç' : 'Kilitle'}</button>
                  <select defaultValue={wallet.agency.level} onChange={(e) => walletAction('set_level', { level: e.target.value })}
                    className="rounded-lg bg-gray-950 border border-gray-700 px-2 py-1.5 text-sm text-gray-100">
                    {data.catalog.levels.map((l: any) => <option key={l.key} value={l.key}>{l.label}</option>)}
                  </select>
                </div>

                <div>
                  <div className="text-sm text-gray-300 mb-2">Muhasebe geçmişi (değiştirilemez)</div>
                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {wallet.transactions.length === 0 && <div className="text-xs text-gray-600">Kayıt yok</div>}
                    {wallet.transactions.map((t: any) => (
                      <div key={t.id} className="text-xs border border-gray-800 rounded p-2 bg-gray-950">
                        <div className="flex justify-between">
                          <span className={t.direction === 'credit' ? 'text-emerald-400' : 'text-red-400'}>
                            {t.direction === 'credit' ? '+' : '−'}{fmt(t.amount)} · {t.type}
                          </span>
                          <span className="text-gray-500">{new Date(t.createdAt).toLocaleString('tr-TR', { timeZone: 'UTC' })}</span>
                        </div>
                        <div className="text-gray-500 mt-1">
                          {fmt(t.balanceBefore)} → {fmt(t.balanceAfter)}
                          {t.targetUserName ? ` · → ${t.targetUserName}` : ''}
                          {t.reason ? ` · ${t.reason}` : ''}
                        </div>
                        <div className="text-gray-700">ID: {t.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'commission' && (
        <AgencyCommissionTab agencies={data.agencies} catalog={data.catalog.sources} onMsg={setMsg} />
      )}
    </div>
  )
}

function AgencyCommissionTab({ agencies, catalog, onMsg }: { agencies: any[]; catalog: any[]; onMsg: (s: string) => void }) {
  const [agencyId, setAgencyId] = useState('')
  const [rules, setRules] = useState<Rule[]>([])
  const [base, setBase] = useState('')
  const [discount, setDiscount] = useState('')
  const [discountScope, setDiscountScope] = useState('')
  const [dailyLimit, setDailyLimit] = useState('')
  const [dailyScope, setDailyScope] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (id: string) => {
    setAgencyId(id); setRules([])
    if (!id) return
    const r = await fetch(`/api/admin/agencies/${id}/commission`, { cache: 'no-store' })
    const j = await r.json()
    if (j.success) {
      setRules(j.data.rules); setBase(String(j.data.agency.commissionRate))
      const pd = j.data.purchaseDiscount
      setDiscountScope(pd?.scope || '')
      setDiscount(pd?.scope === 'agency' ? String(pd.percent) : '')
      const dl = j.data.dailyTransferLimit
      setDailyScope(dl?.scope || '')
      setDailyLimit(dl?.scope === 'agency' ? String(dl.limit) : '')
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/agencies/${agencyId}/commission`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCommissionRate: base, rules, purchaseDiscountPercent: discount, dailyTransferLimit: dailyLimit }),
      })
      const j = await r.json()
      onMsg(j.success ? 'Komisyon kuralları kaydedildi' : (j?.error?.message || 'Hata'))
      if (j.success) load(agencyId)
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
      <select value={agencyId} onChange={(e) => load(e.target.value)}
        className="rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100 text-sm">
        <option value="">Ajans seçin…</option>
        {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {agencyId && (
        <>
          <label className="block text-sm text-gray-300">
            Toplu Jeton alım indirimi (%) — boş bırakılırsa varsayılan
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="varsayılan"
              className="mt-1 w-32 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100" />
            <span className="ml-2 text-xs text-gray-500">şu an: {discountScope === 'agency' ? 'ajansa özel' : 'varsayılan'}</span>
          </label>
          <label className="block text-sm text-gray-300">
            Günlük aktarım limiti (Jeton, 0 = sınırsız) — boş bırakılırsa varsayılan
            <input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="varsayılan"
              className="mt-1 w-32 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100" />
            <span className="ml-2 text-xs text-gray-500">şu an: {dailyScope === 'agency' ? 'ajansa özel' : 'varsayılan'}</span>
          </label>
          <label className="block text-sm text-gray-300">
            Ajansın temel komisyon oranı (%)
            <input value={base} onChange={(e) => setBase(e.target.value)}
              className="mt-1 w-32 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100" />
          </label>

          <div className="space-y-2">
            {rules.map((r, i) => {
              const label = catalog.find((s: any) => s.key === r.sourceType)?.label || r.sourceType
              return (
                <div key={r.sourceType} className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-200 min-w-[220px]">
                    <input type="checkbox" checked={r.enabled}
                      onChange={(e) => { const n = [...rules]; n[i] = { ...r, enabled: e.target.checked }; setRules(n) }} />
                    {label}
                  </label>
                  <input placeholder="oran %" value={r.rate ?? ''}
                    onChange={(e) => { const n = [...rules]; n[i] = { ...r, rate: e.target.value === '' ? null : (e.target.value as any) }; setRules(n) }}
                    className="w-28 rounded bg-gray-950 border border-gray-700 px-2 py-1 text-gray-100 text-sm" />
                  <span className="text-xs text-gray-500">kapsam: {r.scope}</span>
                  <button onClick={() => { const n = [...rules]; (n[i] as any).inherit = true; setRules(n); }}
                    className="text-xs text-amber-500 hover:underline">globale devret</button>
                </div>
              )
            })}
          </div>

          <button onClick={save} disabled={busy}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-5 py-2 font-medium text-black">
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      )}
    </div>
  )
}
