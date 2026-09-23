'use client'

/**
 * BÖLÜM 8 — Yönetici tarafından düzenlenebilen para birimi markasını
 * (ad / ikon / renk) kullanan ortak gösterim bileşeni.
 *
 * Kullanım:
 *   <CurrencyAmount currency="cfc" amount={120} />
 *   <CurrencyIcon currency="jeton" size={20} />
 *   <CurrencyName currency="jeton" />
 */

import Image from 'next/image'
import { useCurrencyBrand } from '@/lib/currency-branding-context'

interface IconProps {
  currency: 'jeton' | 'cfc' | 'credits' | string
  size?: number
  className?: string
}

export function CurrencyIcon({ currency, size = 20, className = '' }: IconProps) {
  const brand = useCurrencyBrand(currency)
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={brand.icon}
        alt={brand.name}
        fill
        sizes={`${size}px`}
        className="object-contain"
        unoptimized
      />
    </span>
  )
}

export function CurrencyName({
  currency,
  className = '',
  colored = false,
}: {
  currency: 'jeton' | 'cfc' | 'credits' | string
  className?: string
  colored?: boolean
}) {
  const brand = useCurrencyBrand(currency)
  return (
    <span className={className} style={colored ? { color: brand.color } : undefined}>
      {brand.name}
    </span>
  )
}

interface AmountProps {
  currency: 'jeton' | 'cfc' | 'credits' | string
  amount: number
  size?: number
  showIcon?: boolean
  showName?: boolean
  colored?: boolean
  className?: string
  amountClassName?: string
}

export default function CurrencyAmount({
  currency,
  amount,
  size = 18,
  showIcon = true,
  showName = true,
  colored = true,
  className = '',
  amountClassName = 'font-bold',
}: AmountProps) {
  const brand = useCurrencyBrand(currency)
  const formatted = Number.isFinite(amount) ? amount.toLocaleString('tr-TR') : '0'

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && <CurrencyIcon currency={currency} size={size} />}
      <span className={amountClassName} style={colored ? { color: brand.color } : undefined}>
        {formatted}
      </span>
      {showName && (
        <span className="opacity-80" style={colored ? { color: brand.color } : undefined}>
          {brand.name}
        </span>
      )}
    </span>
  )
}
