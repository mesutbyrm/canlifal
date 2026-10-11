'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSiteTheme } from '@/lib/theme-context'
import {
  Building2, UserPlus, Send, ArrowLeft, Check, AlertCircle, LogOut, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

export default function AgencyPage() {
  const { data: session } = useSession() || {}
  const searchParams = useSearchParams()
  const { theme } = useSiteTheme()
  const [tab, setTab] = useState<'join' | 'apply'>('join')
  const [inviteCode, setInviteCode] = useState(searchParams?.get('kod') || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [myAgency, setMyAgency] = useState<any>(null)
  const [checkingMembership, setCheckingMembership] = useState(true)

  // Apply form
  const [agencyName, setAgencyName] = useState('')
  const [agencyDesc, setAgencyDesc] = useState('')
  const [agencyEmail, setAgencyEmail] = useState('')
  const [agencyPhone, setAgencyPhone] = useState('')
  // Incoming member invites
  const [incomingInvites, setIncomingInvites] = useState<any[]>([])
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null)

  const isFacebook = theme === 'facebook'
  const isCosmic = theme === 'cosmic'
  const cardBg = isFacebook ? 'bg-white border border-gray-200' : isCosmic ? 'bg-white/5 border border-blue-500/20' : 'bg-[#1a0a2e]/80 border border-fuchsia-500/20'
  const textPrimary = isFacebook ? 'text-gray-900' : 'text-white'
  const textSecondary = isFacebook ? 'text-gray-500' : isCosmic ? 'text-blue-300' : 'text-purple-300'
  const accentColor = isFacebook ? 'text-blue-600' : isCosmic ? 'text-blue-400' : 'text-fuchsia-400'
  const btnPrimary = isFacebook ? 'bg-blue-500 hover:bg-blue-600 text-white' : isCosmic ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
  const inputBg = isFacebook ? 'bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400' : isCosmic ? 'bg-blue-900/40 border-blue-500/30 text-white placeholder:text-blue-400/50' : 'bg-purple-900/40 border-fuchsia-500/30 text-white placeholder:text-purple-400/50'
  const tabActive = isFacebook ? 'bg-blue-500 text-white' : isCosmic ? 'bg-blue-600 text-white' : 'bg-fuchsia-600 text-white'
  const tabInactive = isFacebook ? 'bg-gray-100 text-gray-600' : isCosmic ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'

  const fetchIncomingInvites = () => {
    fetch('/api/agency/invites').then(r => r.json()).then(d => {
      setIncomingInvites(d.invites || [])
    }).catch(() => {})
  }

  useEffect(() => {
    if (session?.user) {
      fetch('/api/agency/my').then(r => r.json()).then(d => {
        setMyAgency(d)
        setCheckingMembership(false)
      }).catch(() => setCheckingMembership(false))
      fetchIncomingInvites()
    } else {
      setCheckingMembership(false)
    }
  }, [session])

  const handleInviteAction = async (inviteId: string, action: 'accept' | 'reject') => {
    setInviteActionLoading(inviteId)
    setMessage(null)
    try {
      const res = await fetch('/api/agency/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      })
      const d = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: d.message || (action === 'accept' ? 'Ajansa katıldınız' : 'Davet reddedildi') })
        fetchIncomingInvites()
        if (action === 'accept') {
          fetch('/api/agency/my').then(r => r.json()).then(setMyAgency).catch(() => {})
        }
      } else {
        setMessage({ type: 'error', text: d.error || 'Hata oluştu' })
      }
    } catch { setMessage({ type: 'error', text: 'Bir hata oluştu' }) }
    finally { setInviteActionLoading(null) }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) { setMessage({ type: 'error', text: 'Davet kodu giriniz' }); return }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/agency/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setTimeout(() => window.location.href = '/ajans-paneli', 1500)
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch { setMessage({ type: 'error', text: 'Bir hata oluştu' }) }
    finally { setLoading(false) }
  }

  const handleApply = async () => {
    if (!agencyName.trim() || agencyName.trim().length < 3) {
      setMessage({ type: 'error', text: 'Ajans adı en az 3 karakter olmalıdır' }); return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/agency/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agencyName.trim(),
          description: agencyDesc.trim() || null,
          contactEmail: agencyEmail.trim() || null,
          contactPhone: agencyPhone.trim() || null,
        })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch { setMessage({ type: 'error', text: 'Bir hata oluştu' }) }
    finally { setLoading(false) }
  }

  const handleLeave = async () => {
    if (!confirm('Ajanstan ayrılmak istediğinize emin misiniz?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/agency/leave', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setMessage({ type: 'error', text: data.error })
      }
    } catch { setMessage({ type: 'error', text: 'Bir hata oluştu' }) }
    finally { setLoading(false) }
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`${cardBg} rounded-2xl p-8 text-center max-w-md`}>
          <Building2 className={`w-16 h-16 ${accentColor} mx-auto mb-4`} />
          <h2 className={`text-xl font-bold ${textPrimary} mb-2`}>Ajans Sistemi</h2>
          <p className={`${textSecondary} mb-6`}>Ajans sistemini kullanmak için giriş yapmanız gerekiyor.</p>
          <Link href="/giris" className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl ${btnPrimary} font-medium`}>
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  // Already in an agency
  if (!checkingMembership && myAgency?.membership) {
    return (
      <div className="min-h-screen p-4 md:p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-bold ${textPrimary}`}>Ajans Üyeliğiniz</h1>
        </div>

        <div className={`${cardBg} rounded-2xl p-6 text-center`}>
          <Building2 className={`w-12 h-12 ${accentColor} mx-auto mb-3`} />
          <h2 className={`text-lg font-bold ${textPrimary} mb-1`}>{myAgency.membership.agency.name}</h2>
          <p className={`text-sm ${textSecondary} mb-4`}>
            Rol: {myAgency.membership.role === 'owner' ? 'Sahip' : myAgency.membership.role === 'manager' ? 'Yönetici' : 'Üye'}
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/ajans-paneli" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${btnPrimary} text-sm font-medium`}>
              <ExternalLink className="w-4 h-4" />
              Ajans Paneli
            </Link>
            <Link href="/ajans-siralama" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${tabInactive} hover:opacity-80 text-sm font-medium`}>
              🏆 Sıralama
            </Link>
            {myAgency.membership.role !== 'owner' && (
              <button
                onClick={handleLeave}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                Ayrıl
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className={`p-2 rounded-lg ${cardBg} hover:opacity-80 transition`}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className={`text-xl font-bold ${textPrimary} flex items-center gap-2`}>
            <Building2 className={`w-6 h-6 ${accentColor}`} />
            Ajans Sistemi
          </h1>
          <p className={`text-xs ${textSecondary}`}>Bir ajansa katılın veya kendi ajansınızı kurun</p>
        </div>
      </div>

      {/* Incoming member invites */}
      {incomingInvites.length > 0 && (
        <div className={`${cardBg} rounded-2xl p-5 mb-6`}>
          <h2 className={`text-base font-bold ${textPrimary} mb-1 flex items-center gap-2`}>
            <UserPlus className={`w-5 h-5 ${accentColor}`} />
            Ajans Davetleriniz
          </h2>
          <p className={`text-xs ${textSecondary} mb-4`}>Sizi üye olmaya davet eden ajanslar</p>
          <div className="space-y-3">
            {incomingInvites.map((inv: any) => (
              <div key={inv.id} className="p-3 rounded-xl bg-black/20 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {inv.agency?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${textPrimary} truncate`}>{inv.agency?.name}</div>
                    <div className={`text-[10px] ${textSecondary}`}>
                      {inv.invitedBy?.name ? `${inv.invitedBy.name} davet etti` : 'Ajans daveti'} • {new Date(inv.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInviteAction(inv.id, 'accept')}
                    disabled={inviteActionLoading === inv.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Kabul Et
                  </button>
                  <button
                    onClick={() => handleInviteAction(inv.id, 'reject')}
                    disabled={inviteActionLoading === inv.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab('join'); setMessage(null) }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'join' ? tabActive : tabInactive}`}
        >
          <UserPlus className="w-4 h-4 inline mr-1.5" />
          Ajansa Katıl
        </button>
        <button
          onClick={() => { setTab('apply'); setMessage(null) }}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'apply' ? tabActive : tabInactive}`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5" />
          Ajans Ol
        </button>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </motion.div>
      )}

      {/* Join Tab */}
      {tab === 'join' && (
        <div className={`${cardBg} rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>Davet Kodu ile Katıl</h2>
          <p className={`text-sm ${textSecondary} mb-4`}>Ajans sahibinden aldığınız davet kodunu girin</p>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Örn: ABC12345"
            maxLength={20}
            className={`w-full px-4 py-3 rounded-xl border text-center font-mono text-lg tracking-widest mb-4 ${inputBg}`}
          />
          <button
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim()}
            className={`w-full py-3 rounded-xl ${btnPrimary} font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {loading ? 'Katılınıyor...' : <><UserPlus className="w-5 h-5" /> Katıl</>}
          </button>
        </div>
      )}

      {/* Apply Tab */}
      {tab === 'apply' && (
        <div className={`${cardBg} rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold ${textPrimary} mb-2`}>Ajans Başvurusu</h2>
          <p className={`text-sm ${textSecondary} mb-4`}>Kendi ajansınızı kurmak için başvurun. Admin onayı gereklidir.</p>
          <div className="space-y-3">
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Ajans Adı *</label>
              <input
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                placeholder="Ajans adınız"
                maxLength={50}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Açıklama</label>
              <textarea
                value={agencyDesc}
                onChange={e => setAgencyDesc(e.target.value)}
                placeholder="Ajansınız hakkında kısa bilgi"
                rows={3}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm resize-none ${inputBg}`}
              />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>İletişim E-postası</label>
              <input
                value={agencyEmail}
                onChange={e => setAgencyEmail(e.target.value)}
                placeholder="iletisim@ajans.com"
                type="email"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>
            <div>
              <label className={`text-xs ${textSecondary} mb-1 block`}>Telefon</label>
              <input
                value={agencyPhone}
                onChange={e => setAgencyPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm ${inputBg}`}
              />
            </div>
            <button
              onClick={handleApply}
              disabled={loading || !agencyName.trim()}
              className={`w-full py-3 rounded-xl ${btnPrimary} font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? 'Gönderiliyor...' : <><Send className="w-5 h-5" /> Başvur</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
