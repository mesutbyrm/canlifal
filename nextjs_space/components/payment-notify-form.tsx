'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Send, Loader2, Check, Wallet, Building2, CreditCard,
  MessageCircle, User, FileText, AlertCircle
} from 'lucide-react'

interface PaymentNotifyFormProps {
  isOpen: boolean
  onClose: () => void
  // Theme props
  modalBg: string
  modalBorder: string
  cardBg: string
  textPrimary: string
  textSecondary: string
  accentColor: string
  goldColor: string
  isFacebook: boolean
  isCosmic: boolean
  // Optional: pre-filled amount context
  contextLabel?: string
  /** Hangi ürün için ödeme bildiriliyor (spec §80-81) */
  productType?: 'jeton' | 'cfc' | 'gold'
  /** Gold için varsayılan gün sayısı */
  defaultGoldDays?: number
  /** Gold paket adı (ör. "1 Aylık Gold") */
  defaultGoldType?: string
}

export default function PaymentNotifyForm({
  isOpen,
  onClose,
  modalBg,
  modalBorder,
  cardBg,
  textPrimary,
  textSecondary,
  accentColor,
  goldColor,
  isFacebook,
  isCosmic,
  contextLabel,
  productType = 'jeton',
  defaultGoldDays,
  defaultGoldType,
}: PaymentNotifyFormProps) {
  const { data: session } = useSession() || {}

  const [paymentMethod, setPaymentMethod] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [senderName, setSenderName] = useState('')
  const [notes, setNotes] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [goldDays, setGoldDays] = useState(defaultGoldDays ? String(defaultGoldDays) : '')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const paymentOptions = [
    { value: 'papara', label: 'Papara', icon: <Wallet className="w-5 h-5" />, gradient: 'from-purple-500 to-purple-700' },
    { value: 'bank_transfer', label: 'Banka Transferi', icon: <Building2 className="w-5 h-5" />, gradient: 'from-blue-500 to-blue-700' },
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" />, gradient: 'from-green-500 to-green-600' },
    { value: 'other', label: 'Diğer', icon: <CreditCard className="w-5 h-5" />, gradient: 'from-gray-500 to-gray-700' },
  ]

  const resetForm = () => {
    setPaymentMethod('')
    setAmount('')
    setTransactionId('')
    setSenderName('')
    setNotes('')
    setRequestedAmount('')
    setGoldDays(defaultGoldDays ? String(defaultGoldDays) : '')
    setError('')
    setSuccess(false)
  }

  const isGold = productType === 'gold'
  const productLabel = productType === 'cfc' ? 'CFC' : productType === 'gold' ? 'Gold Üyelik' : 'Jeton'

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError('Ödeme yöntemi seçin')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Geçerli bir tutar girin')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/payments/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          amount: parseFloat(amount),
          transactionId: transactionId || undefined,
          senderName: senderName || undefined,
          notes: notes || undefined,
          productType,
          requestedAmount: !isGold && requestedAmount ? parseInt(requestedAmount, 10) : undefined,
          requestedGoldDays: isGold && goldDays ? parseInt(goldDays, 10) : undefined,
          requestedGoldType: isGold ? defaultGoldType || undefined : undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
        }, 2500)
      } else {
        setError(data.error || 'Bir hata oluştu')
      }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = isFacebook
    ? 'bg-gray-100 border-2 border-gray-300 text-gray-900 focus:border-blue-500 placeholder-gray-400'
    : isCosmic
    ? 'bg-white/5 border-2 border-blue-500/30 text-white focus:border-blue-400 placeholder-blue-300/40'
    : 'bg-white/5 border-2 border-fuchsia-500/30 text-white focus:border-fuchsia-500 placeholder-purple-400/50'

  const btnPrimary = isFacebook
    ? 'bg-blue-500 hover:bg-blue-600 text-white'
    : isCosmic
    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={`${modalBg} rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-hidden border-t sm:border ${modalBorder} flex flex-col`}
          >
            {/* Header */}
            <div className={`px-4 sm:px-6 pt-4 pb-3 sm:pt-5 sm:pb-4 border-b ${isFacebook ? 'border-gray-200' : 'border-white/10'}`}>
              <div className="w-12 h-1 bg-gray-400/50 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${isFacebook ? 'from-blue-500 to-blue-600' : isCosmic ? 'from-blue-500 to-cyan-500' : 'from-fuchsia-500 to-purple-600'} flex items-center justify-center shadow-lg`}>
                    <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-bold ${textPrimary}`}>
                      Ödeme Bildir
                    </h2>
                    <p className={`text-xs sm:text-sm ${textSecondary}`}>
                      {contextLabel || `${productLabel} ödemenizi bildirin, hızlıca onaylayalım`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className={`p-2 rounded-full transition-colors ${isFacebook ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'}`}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {success ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className={`${textPrimary} text-lg font-bold mb-2`}>Bildirim Gönderildi!</h3>
                  <p className={`${textSecondary} text-sm mb-4`}>
                    Ödemeniz en kısa sürede kontrol edilip onaylanacaktır.
                  </p>
                  <a
                    href="/odemelerim"
                    className={`inline-block text-sm font-semibold underline ${accentColor}`}
                  >
                    Ödeme geçmişimi görüntüle
                  </a>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Payment Method Selection */}
                  <div>
                    <label className={`${textSecondary} text-sm font-medium mb-2 block`}>Ödeme Yöntemi *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setPaymentMethod(opt.value); setError('') }}
                          className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                            paymentMethod === opt.value
                              ? isFacebook
                                ? 'border-blue-500 bg-blue-50'
                                : isCosmic
                                ? 'border-blue-400 bg-blue-500/10'
                                : 'border-fuchsia-500 bg-fuchsia-500/10'
                              : `${cardBg} border opacity-70 hover:opacity-100`
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-white`}>
                            {opt.icon}
                          </div>
                          <span className={`${textPrimary} text-sm font-medium`}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className={`${textSecondary} text-sm font-medium mb-2 block`}>Tutar (₺) *</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step={0.01}
                      placeholder="Ödediğiniz tutarı girin"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError('') }}
                      className={`w-full px-4 py-3 rounded-xl text-lg font-bold focus:outline-none transition-all ${inputClass}`}
                    />
                  </div>

                  {/* Talep edilen ürün miktarı (spec §80-81) */}
                  {isGold ? (
                    <div>
                      <label className={`${textSecondary} text-sm font-medium mb-2 block`}>
                        Kaç Günlük Gold? <span className="opacity-50">(opsiyonel)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={3650}
                        placeholder="Örn. 30"
                        value={goldDays}
                        onChange={(e) => setGoldDays(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className={`${textSecondary} text-sm font-medium mb-2 block`}>
                        Talep Edilen {productLabel} <span className="opacity-50">(opsiyonel)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder={`Yüklenmesini istediğiniz ${productLabel} miktarı`}
                        value={requestedAmount}
                        onChange={(e) => setRequestedAmount(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                      />
                    </div>
                  )}

                  {/* Transaction ID */}
                  <div>
                    <label className={`${textSecondary} text-sm font-medium mb-2 block`}>İşlem No / Referans <span className="opacity-50">(opsiyonel)</span></label>
                    <input
                      type="text"
                      placeholder="İşlem numarası veya referans kodu"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                    />
                  </div>

                  {/* Sender Name */}
                  <div>
                    <label className={`${textSecondary} text-sm font-medium mb-2 block`}>Gönderen İsmi <span className="opacity-50">(opsiyonel)</span></label>
                    <input
                      type="text"
                      placeholder="Hesap sahibi ismi"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all ${inputClass}`}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`${textSecondary} text-sm font-medium mb-2 block`}>Not <span className="opacity-50">(opsiyonel)</span></label>
                    <textarea
                      placeholder="Eklemek istediğiniz not..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-all resize-none ${inputClass}`}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-500/30"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </motion.div>
                  )}

                  {/* Info */}
                  <div className={`p-3 rounded-xl flex items-start gap-2 ${
                    isFacebook ? 'bg-blue-50 border border-blue-200' : 'bg-blue-500/10 border border-blue-500/20'
                  }`}>
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isFacebook ? 'text-blue-500' : 'text-blue-400'}`} />
                    <p className={`text-xs ${isFacebook ? 'text-blue-700' : 'text-blue-300'}`}>
                      Ödemenizi yaptıktan sonra bu formu doldurarak bildirim gönderin. Ekibimiz ödemenizi kontrol edip jetonlarınızı en kısa sürede yükleyecektir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t ${isFacebook ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'}`}>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`w-full py-3 sm:py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${btnPrimary}`}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {submitting ? 'Gönderiliyor...' : 'Ödeme Bildir'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
