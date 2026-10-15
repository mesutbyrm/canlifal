'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

/**
 * E-posta doğrulama bağlantısının açıldığı sayfa
 * (`/e-posta-dogrula?token=…`, auth/email/send-verification gönderir).
 */
export default function EmailVerifyPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')?.trim()
    if (!token) {
      setState('error')
      setMessage('Doğrulama bağlantısı eksik.')
      return
    }
    fetch('/api/auth/email/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setState('ok')
          setMessage(data.message || 'E-posta adresiniz doğrulandı.')
        } else {
          setState('error')
          setMessage(data.error || 'Geçersiz veya süresi dolmuş bağlantı.')
        }
      })
      .catch(() => {
        setState('error')
        setMessage('Bağlantı hatası. Lütfen tekrar deneyin.')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div className="max-w-sm w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-3">
        {state === 'loading' && <Loader2 className="w-10 h-10 mx-auto animate-spin text-fuchsia-400" />}
        {state === 'ok' && <CheckCircle2 className="w-12 h-12 mx-auto text-green-400" />}
        {state === 'error' && <XCircle className="w-12 h-12 mx-auto text-red-400" />}
        <h1 className="text-xl font-bold">E-posta doğrulama</h1>
        <p className="text-white/70 text-sm">{state === 'loading' ? 'Doğrulanıyor…' : message}</p>
        {state !== 'loading' && (
          <a href="/" className="inline-block mt-2 text-fuchsia-400 hover:underline text-sm">Ana sayfaya dön</a>
        )}
      </div>
    </div>
  )
}
