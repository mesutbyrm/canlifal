'use client'

import { useEffect, useState } from 'react'

/** The server decides staff privileges; this hook only controls the gift UI. */
export function useGiftSource(userId?: string, active = true) {
  const [account, setAccount] = useState<{ userId: string; isStaff: boolean } | null>(null)
  const [selection, setSelection] = useState<{ userId: string; value: 'real' | 'fake' } | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!userId || !active) return
    let cancelled = false
    setError(false)
    fetch('/api/jeton/balances', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error('Hediye kaynak bilgisi alınamadı')
        return res.json()
      })
      .then(data => {
        if (!cancelled) setAccount({ userId, isStaff: data.isStaff === true })
      })
      .catch(err => { console.error('[gift-source]', err); if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [userId, active])
  const ready = !!userId && account?.userId === userId && !error
  const isStaff = ready && account?.isStaff === true
  const source = isStaff ? (selection?.userId === userId ? selection.value : 'fake') : 'real'
  return {
    ready, isStaff, source, error,
    setSource: (value: 'real' | 'fake') => { if (userId) setSelection({ userId, value }) },
    canAfford: (amount: number, realBalance: number) => ready && ((isStaff && source === 'fake') || realBalance >= amount),
  }
}

export function GiftSourceSelector({ control, disabled = false }: {
  control: ReturnType<typeof useGiftSource>; disabled?: boolean
}) {
  if (control.error) return <p role="alert" className="my-2 rounded-lg bg-red-950 p-3 text-sm text-red-100">Hediye kaynak bilgisi alınamadı. Paneli yeniden açın veya sayfayı yenileyin.</p>
  if (!control.ready) return <p className="my-2 text-sm text-purple-200">Hediye kaynağı kontrol ediliyor…</p>
  if (!control.isStaff) return null
  return (
    <fieldset disabled={disabled} className="my-3 rounded-xl bg-slate-950 p-3 text-white">
      <legend className="px-1 text-sm font-semibold">Hediye kaynağı</legend>
      <div className="flex gap-2">
        {(['real', 'fake'] as const).map(value => (
          <button key={value} type="button" aria-pressed={control.source === value}
            onClick={() => control.setSource(value)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${control.source === value ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
            {value === 'real' ? 'Real · Gerçek' : 'Fake · Puan'}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-200">{control.source === 'real'
        ? 'Gerçek bakiyenizden düşer; alıcıya mevcut komisyon kurallarına göre kazanç yazılır.'
        : 'Yalnız puan olarak sayılır. Gerçek veya çekilebilir kazanç oluşturmaz.'}</p>
    </fieldset>
  )
}
