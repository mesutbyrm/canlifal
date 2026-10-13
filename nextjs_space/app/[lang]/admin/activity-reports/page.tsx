'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const formatTime = (value: string | null) => value ? new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }) : 'Kayıt yok / devam ediyor'
const duration = (seconds: number | null | undefined) => seconds == null ? 'Kayıtlı değil' : `${Math.floor(seconds / 60)} dk ${seconds % 60} sn`
export default function ActivityReportsPage() {
  const { status } = useSession() || {}
  const [filters,setFilters] = useState({ kind: 'room', status: 'all', from: '', to: '', userId: '', roomId: '', tellerId: '', sessionId: '' })
  const [applied,setApplied] = useState(filters)
  const [page,setPage] = useState(1)
  const [data,setData] = useState<any>(null)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  useEffect(() => {
    if (status !== 'authenticated') return
    const abort = new AbortController()
    setLoading(true); setError('')
    const p = new URLSearchParams({ ...applied, page: String(page) })
    fetch(`/api/admin/activity-reports?${p}`, { signal: abort.signal }).then(async res => {
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Rapor alınamadı')
      setData(body)
    }).catch(e => { if (e.name !== 'AbortError') { console.error(e); setError(e.message); setData(null) } }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [applied,page,status])
  if (status === 'unauthenticated') return <main className="p-8 text-white"><Link href="/giris">Raporları görmek için giriş yapın</Link></main>
  return <main className="max-w-6xl mx-auto p-4 md:p-8 text-white">
    <Link href="/admin/finance" className="text-purple-300 text-sm">← Finans yönetimi</Link>
    <h1 className="text-2xl font-bold my-5">Oda, koltuk, falcı ve yayın süreleri</h1>
    <form onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ ...filters }) }} className="rounded-2xl bg-[#1a0a2e] p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <label className="text-sm">Rapor<select value={filters.kind} onChange={e => setFilters(f => ({ ...f, kind: e.target.value, roomId: '', tellerId: '', sessionId: '' }))} className="block w-full p-2 mt-1 rounded bg-purple-950"><option value="room">Oda / koltuk</option><option value="teller">Falcı seansı</option><option value="stream">Canlı yayın</option></select></label>
      <label className="text-sm">Durum<select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="block w-full p-2 mt-1 rounded bg-purple-950"><option value="all">Tümü</option><option value="active">Aktif</option><option value="closed">Kapanmış</option></select></label>
      {([['from','Başlangıç tarihi'],['to','Bitiş tarihi']] as const).map(([key,label]) => <label key={key} className="text-sm">{label}<input type="date" value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))} className="block w-full p-2 mt-1 rounded bg-purple-950" /></label>)}
      {([['userId','Kullanıcı ID'], ...(filters.kind !== 'teller' ? [['roomId','Oda / yayın ID']] : [['tellerId','Falcı ID']]), ['sessionId','Oturum ID']] as [keyof typeof filters,string][]).map(([key,label]) => <label key={key} className="text-sm">{label}<input value={filters[key]} onChange={e => setFilters(f => ({ ...f, [key]: e.target.value.trim() }))} className="block w-full p-2 mt-1 rounded bg-purple-950" /></label>)}
      <button type="submit" disabled={loading} className="self-end bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded p-2">Raporu getir</button>
    </form>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {loading ? <p>Rapor yükleniyor…</p> : data && <>
      <p className="text-sm text-purple-200 mb-4">{data.coverage}</p>
      <p className="text-xs text-gray-300 mb-3">Türkiye saati · Oda filtresi oturum başlangıcına, falcı/yayın filtresi kayıt tarihine uygulanır. Kullanıcı filtresi eşleşen oturumları seçer; oda toplamları tüm katılımcıları kapsar.</p>
      {!data.rows.length && <p>Bu filtrelerde kayıt bulunamadı.</p>}
      <div className="space-y-3">{data.rows.map((row: any) => <article key={row.id} className="bg-[#1a0a2e] rounded-xl p-4">
        <h2 className="font-semibold text-purple-200">{row.title || row.teller?.displayName || row.roomId || 'Oturum'} · {row.status}</h2>
        <p className="text-xs break-all text-gray-300 my-2">Oturum: {row.id} · Kullanıcı: {row.userId || 'Kayıtlı değil'}</p>
        <p className="text-sm">{formatTime(row.startedAt)} → {formatTime(row.endedAt)}</p>
        <p className="mt-2">Geçen süre: {duration(row.durationSeconds)}</p>
        {applied.kind === 'room' && <div className="text-sm text-gray-200 space-y-1 mt-2">
          <p>{row.totalVisits} ziyaret · {row.uniqueVisitors} tekil kişi · {row.returnVisits} tekrar ziyaret</p>
          <p>Toplam ziyaret süresi: {duration(row.totalDwellSeconds)} · Koltukta toplam: {duration(row.seatSeconds)}</p>
          <p>Ortalama ziyaret: {duration(row.avgDwellSeconds)}</p>
          <p>Koltuklar: {Object.entries(row.seats || {}).map(([seat,seconds]) => `${Number(seat) + 1}: ${duration(seconds as number)}`).join(' · ') || 'Kayıt yok'}</p>
          {row.closureReport && <p className="text-amber-200">Kalıcı kapanış özeti: {row.closureReport.grossGiftJeton} brüt jeton · {row.closureReport.netOwnerJeton} sahibin net payı · {row.closureReport.giftPointTotal} hediye puanı</p>}
        </div>}
        {applied.kind === 'teller' && <p className="text-sm text-gray-200 mt-2">Kayıtlı kullanılan dakika: {row.minutesUsed} · Seans bedeli: {row.creditsCharged} CFC</p>}
      </article>)}</div>
      <div className="flex items-center justify-between mt-5"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Önceki</button><span>{page} / {Math.max(1,data.totalPages)} · {data.total} kayıt</span><button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Sonraki</button></div>
    </>}
  </main>
}
