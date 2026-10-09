'use client'

import { useCallback, useEffect, useState } from 'react'

type Tab = 'promises' | 'alerts' | 'reports' | 'settings'

const input = 'mt-1 w-full rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100'
const card = 'rounded-xl border border-gray-800 bg-gray-900 p-5'
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString('tr-TR') : '—')
const periodLabel: Record<string, string> = { daily: 'günlük', weekly: 'haftalık', monthly: 'aylık' }

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.success === false) throw new Error(typeof j.error === 'string' ? j.error : j?.error?.message || 'İşlem başarısız')
  return j
}

/** Ajans Yönetimi: vaat sürümü onayı, şüpheli işlemler, CSV raporlar, keşif/vaat/uyarı ayarları. */
export default function AjansYonetimiPage() {
  const [tab, setTab] = useState<Tab>('promises')
  const [msg, setMsg] = useState('')
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Ajans Yönetimi</h1>
        <p className="text-sm text-gray-400">Vaat onayı, şüpheli işlem uyarıları, raporlar ve ayarlar. Cüzdan/indirim/komisyon: Ajans Finans Merkezi.</p>
      </div>
      {msg && <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-2 text-sm text-amber-300">{msg}</div>}
      <div className="flex gap-2 border-b border-gray-800">
        {([['promises', 'Vaat Onayı'], ['alerts', 'Şüpheli İşlemler'], ['reports', 'Raporlar (CSV)'], ['settings', 'Ayarlar']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setMsg('') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === k ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'promises' && <PromisesTab onMsg={setMsg} />}
      {tab === 'alerts' && <AlertsTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'settings' && <SettingsTab onMsg={setMsg} />}
    </div>
  )
}

function PromisesTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const load = useCallback(async () => {
    setErr(''); setRows(null)
    try { setRows((await api(`/api/admin/agency-management/promises?status=${status}`)).data) } catch (e: any) { setErr(e.message) }
  }, [status])
  useEffect(() => { load() }, [load])

  const act = async (versionId: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('Bu sürüm yayımlanacak ve değiştirilemez. Onaylıyor musunuz?')) return
    setBusy(versionId)
    try {
      const j = await api('/api/admin/agency-management/promises', { method: 'POST', body: JSON.stringify({ versionId, action, note: notes[versionId] || '' }) })
      onMsg(j.message); load()
    } catch (e: any) { onMsg(e.message) } finally { setBusy('') }
  }

  return (
    <div className="space-y-4">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100">
        {[['pending', 'Onay bekleyen'], ['approved', 'Yayında'], ['superseded', 'Eski sürümler'], ['rejected', 'Reddedilen'], ['all', 'Tümü']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {err && <p className="text-red-400 text-sm">{err} <button className="underline" onClick={load}>Tekrar dene</button></p>}
      {!rows && !err && <p className="text-gray-400 text-sm">Yükleniyor…</p>}
      {rows && rows.length === 0 && <p className="text-gray-400 text-sm">Kayıt yok.</p>}
      {rows?.map((v) => (
        <div key={v.id} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-gray-100">{v.title} <span className="text-gray-400">· sürüm {v.version}</span></div>
              <div className="text-xs text-gray-400">{v.agencyName} · {fmtDate(v.createdAt)} · durum: {v.status}</div>
            </div>
            {v.targetMinutes ? (
              <div className="text-sm text-amber-300">Hedef: {periodLabel[v.targetPeriod] ?? v.targetPeriod} {Math.round(v.targetMinutes / 6) / 10} saat{v.minDays ? ` · en az ${v.minDays} gün` : ''}{v.bonusJeton ? ` · bonus ${v.bonusJeton} Jeton` : ''}</div>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-200">{v.body}</p>
          <p className="mt-2 text-xs text-gray-400"><b>Ölçüm:</b> {v.measurement}</p>
          <p className="mt-1 text-xs text-gray-400">Geçerlilik: {fmtDate(v.periodStart)} – {v.periodEnd ? fmtDate(v.periodEnd) : 'süresiz'} · Yeniden kabul: {v.requiresReaccept ? 'gerekli' : 'gerekmez'}</p>
          {v.currentApproved && (
            <details className="mt-2 text-xs text-gray-400">
              <summary className="cursor-pointer">Yayındaki sürüm {v.currentApproved.version} ile karşılaştır</summary>
              <p className="mt-1 whitespace-pre-wrap">{v.currentApproved.body}</p>
            </details>
          )}
          {v.reviewNote && <p className="mt-2 text-xs text-gray-400">Not: {v.reviewNote}</p>}
          {v.status === 'pending' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input placeholder="Not / ret gerekçesi" value={notes[v.id] || ''} onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })}
                className="flex-1 min-w-[200px] rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100 text-sm" />
              <button disabled={busy === v.id} onClick={() => act(v.id, 'approve')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Onayla ve yayımla</button>
              <button disabled={busy === v.id} onClick={() => act(v.id, 'reject')} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Reddet</button>
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-gray-500">Onaylanan sürüm değiştirilemez. Ajans yeni şart için yeni sürüm gönderir; önceki kabul kayıtları saklanır. Vaatlerin hukuki bağlayıcılığı ayrıca hukuk incelemesi gerektirir.</p>
    </div>
  )
}

const ALERT_LABEL: Record<string, string> = {
  large_transfer: 'Büyük aktarım', repeat_target: 'Aynı kullanıcıya sık aktarım', new_account: 'Yeni hesaba aktarım',
  self_dealing: 'Sahibine/yetkilisine aktarım', daily_outflow: 'Günlük çıkış eşiği', cancelled_orders: 'İptal edilen siparişler',
}

function AlertsTab() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    setErr(''); setData(null)
    try { setData((await api(`/api/admin/agency-management/alerts?days=${days}`)).data) } catch (e: any) { setErr(e.message) }
  }, [days])
  useEffect(() => { load() }, [load])
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        Son
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg bg-gray-950 border border-gray-700 px-3 py-2 text-gray-100">
          {[1, 7, 30, 90].map((d) => <option key={d} value={d}>{d} gün</option>)}
        </select>
        <button onClick={load} className="rounded-lg border border-gray-700 px-3 py-2">Yenile</button>
      </div>
      {err && <p className="text-red-400 text-sm">{err}</p>}
      {!data && !err && <p className="text-gray-400 text-sm">Hesaplanıyor…</p>}
      {data && data.count === 0 && <p className="text-emerald-400 text-sm">Bu dönemde uyarı yok.</p>}
      {data?.alerts?.map((a: any, i: number) => (
        <div key={i} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
          <div>
            <div className={`text-sm font-semibold ${a.severity === 'high' ? 'text-red-400' : 'text-amber-300'}`}>{ALERT_LABEL[a.kind] ?? a.kind} · {a.agencyName}</div>
            <div className="text-sm text-gray-200">{a.message}</div>
            <div className="text-xs text-gray-500">{fmtDate(a.at)} · {a.refs.length} kayıt</div>
          </div>
          <a className="text-xs text-amber-400 underline" href={`/api/admin/agency-management/reports?type=wallet&agencyId=${a.agencyId}&from=${new Date(Date.now() - days * 86400000).toISOString()}&to=${new Date().toISOString()}`}>Cüzdan hareketleri (CSV)</a>
        </div>
      ))}
    </div>
  )
}

function ReportsTab() {
  const [agencies, setAgencies] = useState<any[]>([])
  const [agencyId, setAgencyId] = useState('')
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  useEffect(() => {
    api('/api/agencies?limit=50&sort=newest').then((j) => setAgencies(j.data.agencies)).catch(() => setAgencies([]))
  }, [])
  const href = (type: string) => {
    const q = new URLSearchParams({ type, from: new Date(from).toISOString(), to: new Date(to).toISOString() })
    if (agencyId) q.set('agencyId', agencyId)
    return `/api/admin/agency-management/reports?${q}`
  }
  const types: [string, string, boolean][] = [
    ['wallet', 'Cüzdan hareketleri (yükleme, aktarım, düzeltme)', false],
    ['purchases', 'Toplu Jeton siparişleri', false],
    ['performance', 'Yayıncı performansı (doğrulanmış saat, gün, hediye)', true],
    ['accruals', 'Hedef hak edişleri ve ödemeler', false],
    ['history', 'Üyelik geçmişi (katılım/ayrılış)', false],
    ['acceptances', 'Vaat kabul kayıtları', false],
  ]
  return (
    <div className={`${card} space-y-4`}>
      <div className="grid md:grid-cols-3 gap-4">
        <label className="text-sm text-gray-300">Ajans
          <select value={agencyId} onChange={(e) => setAgencyId(e.target.value)} className={input}>
            <option value="">Tüm ajanslar</option>
            {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-300">Başlangıç<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} /></label>
        <label className="text-sm text-gray-300">Bitiş<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} /></label>
      </div>
      <p className="text-xs text-gray-500">En fazla 92 günlük aralık. Dosyalar Excel ile açılır (UTF-8). Dışa aktarımlar denetim kaydına yazılır.</p>
      <div className="space-y-2">
        {types.map(([t, l, needsAgency]) => (
          <div key={t} className="flex items-center justify-between border-b border-gray-800 py-2 text-sm">
            <span className="text-gray-200">{l}</span>
            {needsAgency && !agencyId
              ? <span className="text-xs text-gray-500">Ajans seçin</span>
              : <a className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white" href={href(t)}>CSV indir</a>}
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    try { const j = await api('/api/admin/agency-management/settings'); setData(j.data); setVals(j.data.values) } catch (e: any) { setErr(e.message) }
  }, [])
  useEffect(() => { load() }, [load])
  if (err) return <p className="text-red-400 text-sm">{err}</p>
  if (!data) return <p className="text-gray-400 text-sm">Yükleniyor…</p>
  const k = data.keys
  const set = (key: string, v: string) => setVals({ ...vals, [key]: v })
  const save = async () => {
    try { const j = await api('/api/admin/agency-management/settings', { method: 'PUT', body: JSON.stringify({ values: vals }) }); onMsg(j.message); setVals(j.data) } catch (e: any) { onMsg(e.message) }
  }
  const periods = (vals[k.promiseAllowedPeriods] || '').split(',').filter(Boolean)
  const field = (key: string, label: string, hint?: string) => (
    <label className="text-sm text-gray-300">{label}
      <input value={vals[key] ?? ''} onChange={(e) => set(key, e.target.value)} className={input} />
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  )
  return (
    <div className="space-y-6">
      <div className={`${card} space-y-4`}>
        <h2 className="font-semibold text-gray-100">Ajanslar keşif sayfası</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-sm text-gray-300">Varsayılan sıralama
            <select value={vals[k.discoveryDefaultSort]} onChange={(e) => set(k.discoveryDefaultSort, e.target.value)} className={input}>
              {[['recommended', 'Önerilen (öne çıkan > seviye > saat)'], ['hours', 'Doğrulanmış yayın saati'], ['members', 'Aktif yayıncı'], ['success', 'Hedef başarı oranı'], ['level', 'Seviye'], ['newest', 'En yeni']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {field(k.discoveryFeatured, 'Öne çıkan ajans kimlikleri', 'Virgülle ayırın; listede en üstte gösterilir')}
          {field(k.discoveryHidden, 'Gizlenen ajans kimlikleri', 'Virgülle ayırın; keşifte görünmez')}
        </div>
      </div>
      <div className={`${card} space-y-4`}>
        <h2 className="font-semibold text-gray-100">Vaat kuralları</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 mt-6">
            <input type="checkbox" checked={vals[k.promiseEnabled] !== 'false'} onChange={(e) => set(k.promiseEnabled, e.target.checked ? 'true' : 'false')} /> Ajanslar vaat önerebilir
          </label>
          {field(k.promiseMaxBonus, 'En yüksek bonus (Jeton, 0 = sınırsız)')}
          {field(k.promiseMaxTargetMinutes, 'En yüksek hedef (dakika, 0 = sınırsız)')}
        </div>
        <div className="flex gap-4 text-sm text-gray-300">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <label key={p} className="flex items-center gap-2">
              <input type="checkbox" checked={periods.includes(p)}
                onChange={(e) => set(k.promiseAllowedPeriods, (e.target.checked ? [...periods, p] : periods.filter((x) => x !== p)).join(','))} />
              {periodLabel[p]} hedef
            </label>
          ))}
        </div>
      </div>
      <div className={`${card} space-y-4`}>
        <h2 className="font-semibold text-gray-100">Şüpheli işlem eşikleri</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {field(k.alertTransferJeton, 'Tek aktarım (Jeton)')}
          {field(k.alertDailyOutflowJeton, 'Günlük toplam çıkış (Jeton)')}
          {field(k.alertRepeatCount, 'Aynı kullanıcıya günlük aktarım sayısı')}
          {field(k.alertNewAccountDays, 'Yeni hesap (gün)')}
        </div>
      </div>
      <button onClick={save} className="rounded-lg bg-amber-600 px-5 py-2 font-semibold text-white">Kaydet</button>
    </div>
  )
}
