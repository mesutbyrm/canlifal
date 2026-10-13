'use client'

import { useCallback, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PendingConfirm {
  message: string
  resolve: (approved: boolean) => void
}

/**
 * Kritik işlem onayı (spec §88).
 *
 * Sunucu, eşik üstü finansal/yetki işlemlerinde 409 + { requiresConfirmation, confirmationMessage }
 * döndürür. Bu hook, isteği gönderir; 409 gelirse kullanıcıya onay diyaloğu gösterir ve
 * onaylanırsa aynı gövdeyi `confirm: true` ile tekrar yollar.
 *
 * Kullanıcı vazgeçerse status 499 ve { cancelled: true } içeren bir yanıt döner.
 */
export function useCriticalConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [working, setWorking] = useState(false)

  const postJson = useCallback(async (url: string, body: any): Promise<Response> => {
    const send = (payload: any) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

    let res = await send(body)

    if (res.status === 409) {
      let data: any = null
      try {
        data = await res.clone().json()
      } catch {
        /* gövde JSON değilse yok say */
      }

      if (data?.requiresConfirmation) {
        const approved = await new Promise<boolean>((resolve) => {
          setPending({
            message: data.confirmationMessage || 'Bu kritik işlemi onaylıyor musunuz?',
            resolve,
          })
        })
        setPending(null)

        if (!approved) {
          return new Response(
            JSON.stringify({ error: 'İşlem iptal edildi', cancelled: true }),
            { status: 499, headers: { 'Content-Type': 'application/json' } }
          )
        }

        setWorking(true)
        try {
          res = await send({ ...body, confirm: true })
        } finally {
          setWorking(false)
        }
      }
    }

    return res
  }, [])

  const dialog = (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => pending.resolve(false)}
        >
          <motion.div
            initial={{ scale: 0.93, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.93, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#1a1030] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/15 p-2.5">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Kritik işlem onayı</h3>
                <p className="mt-2 text-sm leading-relaxed text-purple-200">{pending.message}</p>
                <p className="mt-3 text-xs text-purple-400">
                  Bu işlem kayıt altına alınır ve geri alınması zordur.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => pending.resolve(false)}
                className="flex-1 rounded-xl border border-purple-500/30 px-4 py-2.5 text-sm font-medium text-purple-200 transition hover:bg-purple-500/10"
              >
                Vazgeç
              </button>
              <button
                onClick={() => pending.resolve(true)}
                disabled={working}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-60"
              >
                {working ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  'Evet, onaylıyorum'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return { postJson, confirmDialog: dialog }
}
