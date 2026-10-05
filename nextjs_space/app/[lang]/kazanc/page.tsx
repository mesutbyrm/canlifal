'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import {
  Wallet,
  TrendingUp,
  Users,
  Building2,
  ArrowDownToLine,
  History,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'

interface CurrencyBrand {
  key: 'jeton' | 'cfc'
  name: string
  nameEn: string
  icon: string
  color: string
  convertible: boolean
}

interface WalletTx {
  id: string
  currency: 'cfc' | 'jeton'
  amount: number
  type: string
  description: string | null
  balanceAfter: number
  createdAt: string
}

interface WalletData {
  balances: { cfc: number; jeton: number; legacyCfc: number }
  branding: { jeton: CurrencyBrand; cfc: CurrencyBrand }
  rules: { convertible: string[]; nonConvertible: string[]; note: string }
  earnings: {
    totalEarned: number
    monthlyEarned: number
    referralEarned: number
    agencyEarned: number
    transactionCount: number
    invitedCount: number
    referralCreditsEarned: number
    tellerEarnings: number
  }
  referralCode: string | null
  withdrawal: {
    canWithdraw: boolean
    minWithdrawal: number
    maxWithdrawal: number
    jetonTlRate: number
    estimatedTl: number
    pending: { id: string; amount: number; amountTL: number; status: string; createdAt: string } | null
    history: Array<{
      id: string
      amount: number
      amountTL: number
      method: string
      status: string
      adminNote: string | null
      createdAt: string
    }>
  }
  transactions: WalletTx[]
  total: number
  limit: number
  offset: number
}

const TX_LABELS: Record<string, string> = {
  purchase: 'Yükleme',
  admin_credit: 'Yönetici yüklemesi',
  topup_bonus: 'Yükleme bonusu',
  referral: 'Referans komisyonu',
  agency_invite: 'Ajans komisyonu',
  gift_sent: 'Hediye gönderimi',
  gift_received: 'Hediye geliri',
  fortune: 'Fal / Tarot',
  bana_ozel: 'Bana Özel',
  lucky_gift_bet: 'Şanslı hediye bahsi',
  lucky_gift_win: 'Şanslı hediye kazancı',
  daily_bonus: 'Günlük ödül',
  streak_bonus: 'Seri ödülü',
  task: 'Görev ödülü',
  spend: 'Harcama',
  welcome: 'Hoş geldin ödülü',
  reward: 'Ödül',
  withdrawal: 'Para çekimi',
  stream: 'Yayın',
}

const WITHDRAWAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Ajans onayı bekliyor', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  agency_approved: { label: 'Yönetici onayı bekliyor', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  processing: { label: 'İşleniyor', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  approved: { label: 'Onaylandı', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  completed: { label: 'Ödendi', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Reddedildi', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
}

const PAGE_SIZE = 20

export default function KazancPage() {
  const { status } = useSession() || {}
  const [data, setData] = useState<WalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'cfc' | 'jeton'>('all')
  const [page, setPage] = useState(0)

  // Çekim formu
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<{
    grossTL: number
    taxPercent: number
    taxAmount: number
    netAmountTL: number
  } | null>(null)
  const [method, setMethod] = useState('bank_transfer')
  const [accountDetails, setAccountDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/user/wallet?currency=${filter}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      )
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error('[kazanc] load error:', e)
    } finally {
      setIsLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    if (status === 'authenticated') {
      load()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [status, load])

  // Para çekim ön hesabı (vergi/kesinti dâhil)
  useEffect(() => {
    const value = parseInt(amount, 10)
    if (!value || value <= 0) {
      setQuote(null)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/withdrawals/quote?amount=${value}`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setQuote(json)
      } catch {
        /* sessizce yoksay */
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [amount])

  const submitWithdrawal = async () => {
    setFormError(null)
    setFormSuccess(null)
    const value = parseInt(amount, 10)
    if (!value || value <= 0) {
      setFormError('Geçerli bir miktar girin')
      return
    }
    if (!accountDetails.trim()) {
      setFormError('Hesap bilgilerini girin (IBAN / ad soyad)')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: value,
          method,
          accountDetails: accountDetails.trim(),
          currency: 'jeton',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(json?.error || 'Çekim talebi oluşturulamadı')
      } else {
        setFormSuccess('Çekim talebiniz oluşturuldu.')
        setAmount('')
        setAccountDetails('')
        load()
      }
    } catch (e) {
      setFormError('Bağlantı hatası, tekrar deneyin')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
        <LoadingSpinner message="Yükleniyor..." />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gold-400 mx-auto mb-4" />
          <h1 className="font-serif text-2xl text-gold-400 mb-4">Giriş Yapın</h1>
          <p className="text-deep-purple-200 mb-6">Bakiye ve kazançlarınızı görmek için giriş yapın.</p>
          <Link
            href="/giris"
            className="px-6 py-3 bg-gold-600 text-black rounded-lg font-medium hover:bg-gold-500"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0118] to-deep-purple-975 px-4">
        <p className="text-deep-purple-200">Cüzdan bilgileri alınamadı.</p>
      </div>
    )
  }

  const { balances, branding, earnings, withdrawal, transactions } = data
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE))

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-5xl mx-auto">
        {/* Başlık */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl md:text-4xl text-gold-400 mb-2">Bakiye & Kazanç</h1>
          <p className="text-deep-purple-300 text-sm">{data.rules.note}</p>
        </div>

        {/* Bakiye kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {([branding.cfc, branding.jeton] as CurrencyBrand[]).map((brand) => {
            const value = brand.key === 'cfc' ? balances.cfc : balances.jeton
            return (
              <motion.div
                key={brand.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 bg-deep-purple-900/40 border border-purple-500/25 shadow-lg"
                style={{ borderColor: `${brand.color}40` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-deep-purple-200">{brand.name}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      brand.convertible
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {brand.convertible ? 'Paraya çevrilebilir' : 'Paraya çevrilemez'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: brand.color }}>
                    {value.toLocaleString('tr-TR')}
                  </span>
                  <span className="text-sm text-deep-purple-300">{brand.name}</span>
                </div>
                {brand.key === 'jeton' && withdrawal.jetonTlRate > 0 && (
                  <p className="text-xs text-deep-purple-400 mt-2">
                    Yaklaşık {withdrawal.estimatedTl.toLocaleString('tr-TR')} ₺
                  </p>
                )}
                {brand.key === 'cfc' && (
                  <p className="text-xs text-deep-purple-400 mt-2">
                    Fal/Tarot, Bana Özel, oyunlar ve şanslı hediyede kullanılır.
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Kazanç özeti */}
        <div className="rounded-2xl p-5 bg-deep-purple-900/40 border border-purple-500/25 mb-8">
          <h2 className="flex items-center gap-2 text-gold-400 font-semibold mb-4">
            <TrendingUp className="w-5 h-5" /> Kazanç Özeti
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat icon={<TrendingUp className="w-4 h-4" />} label="Toplam komisyon" value={earnings.totalEarned} />
            <SummaryStat icon={<History className="w-4 h-4" />} label="Bu ay" value={earnings.monthlyEarned} />
            <SummaryStat icon={<Users className="w-4 h-4" />} label="Referans kazancı" value={earnings.referralEarned} />
            <SummaryStat icon={<Building2 className="w-4 h-4" />} label="Ajans kazancı" value={earnings.agencyEarned} />
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-deep-purple-300">
            <span>Davet ettiğin kişi: {earnings.invitedCount}</span>
            <span>Komisyon işlemi: {earnings.transactionCount}</span>
            {earnings.tellerEarnings > 0 && <span>Falcı kazancı: {earnings.tellerEarnings}</span>}
            <Link href="/davet" className="text-gold-400 hover:text-gold-300">
              Davet sayfasına git →
            </Link>
          </div>
        </div>

        {/* Para çekme */}
        <div className="rounded-2xl p-5 bg-deep-purple-900/40 border border-purple-500/25 mb-8">
          <h2 className="flex items-center gap-2 text-gold-400 font-semibold mb-1">
            <ArrowDownToLine className="w-5 h-5" /> Para Çekme
          </h2>
          <p className="text-xs text-deep-purple-300 mb-4">
            Yalnızca {branding.jeton.name} bakiyesi çekilebilir. Minimum {withdrawal.minWithdrawal}{' '}
            {branding.jeton.name}
            {withdrawal.maxWithdrawal > 0 && ` · Maksimum ${withdrawal.maxWithdrawal} ${branding.jeton.name}`}.
          </p>

          {!withdrawal.canWithdraw ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/25 text-sm text-deep-purple-200">
              <Lock className="w-4 h-4 mt-0.5 shrink-0 text-purple-300" />
              <span>
                Para çekme yetkin bulunmuyor. Bu özellik onaylı falcı hesapları için açıktır.
              </span>
            </div>
          ) : withdrawal.pending ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-sm text-amber-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {withdrawal.pending.amount} {branding.jeton.name} tutarında bekleyen bir talebin var. Sonuçlanmadan
                yeni talep oluşturamazsın.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-deep-purple-300 mb-1">Miktar ({branding.jeton.name})</label>
                  <input
                    type="number"
                    min={withdrawal.minWithdrawal}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(withdrawal.minWithdrawal)}
                    className="w-full px-3 py-2 bg-deep-purple-900/60 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-gold-500"
                  />
                  {parseInt(amount, 10) > 0 && quote && (
                    <div className="mt-2 rounded-lg border border-purple-500/30 bg-deep-purple-900/40 p-2 space-y-1">
                      <div className="flex justify-between text-[11px] text-deep-purple-300">
                        <span>Toplam kazandığınız</span>
                        <span className="text-white">{quote.grossTL.toFixed(2)} ₺</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-deep-purple-300">
                        <span>{quote.taxPercent > 0 ? `Kesinti (%${quote.taxPercent})` : 'Kesinti yok'}</span>
                        <span className="text-red-300">-{quote.taxAmount.toFixed(2)} ₺</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold border-t border-purple-500/20 pt-1">
                        <span className="text-gold-300">Elinize geçecek tahmini tutar</span>
                        <span className="text-gold-400">{quote.netAmountTL.toFixed(2)} ₺</span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-deep-purple-300 mb-1">Yöntem</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-deep-purple-900/60 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-gold-500"
                  >
                    <option value="bank_transfer">Banka havalesi (IBAN)</option>
                    <option value="papara">Papara</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-deep-purple-300 mb-1">Hesap bilgileri</label>
                <textarea
                  rows={2}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00 — Ad Soyad"
                  className="w-full px-3 py-2 bg-deep-purple-900/60 border border-purple-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
              {formError && (
                <p className="flex items-center gap-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </p>
              )}
              {formSuccess && (
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" /> {formSuccess}
                </p>
              )}
              <button
                onClick={submitWithdrawal}
                disabled={submitting}
                className="px-5 py-2.5 bg-gold-600 hover:bg-gold-500 disabled:bg-gold-600/50 text-black rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Çekim talebi oluştur
              </button>
            </div>
          )}

          {withdrawal.history.length > 0 && (
            <div className="mt-5 pt-4 border-t border-purple-500/20">
              <h3 className="text-sm text-deep-purple-200 mb-2">Son çekim talepleri</h3>
              <div className="space-y-2">
                {withdrawal.history.map((w) => {
                  const st = WITHDRAWAL_STATUS[w.status] || {
                    label: w.status,
                    className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                  }
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 text-sm px-3 py-2 rounded-lg bg-deep-purple-900/50"
                    >
                      <span className="text-white">
                        {w.amount} {branding.jeton.name}
                        <span className="text-deep-purple-400"> · {w.amountTL.toFixed(2)} ₺</span>
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.className}`}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* İşlem geçmişi */}
        <div className="rounded-2xl p-5 bg-deep-purple-900/40 border border-purple-500/25">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="flex items-center gap-2 text-gold-400 font-semibold">
              <History className="w-5 h-5" /> İşlem Geçmişi
            </h2>
            <div className="flex gap-1">
              {([
                { key: 'all', label: 'Tümü' },
                { key: 'cfc', label: branding.cfc.name },
                { key: 'jeton', label: branding.jeton.name },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setFilter(f.key)
                    setPage(0)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs ${
                    filter === f.key
                      ? 'bg-gold-600 text-black font-medium'
                      : 'bg-deep-purple-900/60 text-deep-purple-200 hover:bg-deep-purple-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-deep-purple-400 py-6 text-center">Henüz işlem yok.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => {
                const brand = t.currency === 'cfc' ? branding.cfc : branding.jeton
                const positive = t.amount >= 0
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-deep-purple-900/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {t.description || TX_LABELS[t.type] || t.type}
                      </p>
                      <p className="text-[11px] text-deep-purple-400">
                        {new Date(t.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} ·{' '}
                        {TX_LABELS[t.type] || t.type}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
                        {positive ? '+' : ''}
                        {t.amount.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-[11px]" style={{ color: brand.color }}>
                        {brand.name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg bg-deep-purple-900/60 text-deep-purple-200 disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="text-deep-purple-300 text-xs">
                Sayfa {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-deep-purple-900/60 text-deep-purple-200 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 rounded-xl bg-deep-purple-900/50 border border-purple-500/20">
      <div className="flex items-center gap-1.5 text-[11px] text-deep-purple-300 mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value.toLocaleString('tr-TR')}</p>
    </div>
  )
}
