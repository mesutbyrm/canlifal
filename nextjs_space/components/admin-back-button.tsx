'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface AdminBackButtonProps {
  className?: string
  label?: string
  variant?: 'link' | 'button'
}

export default function AdminBackButton({ className, label, variant = 'button' }: AdminBackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/admin')
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleBack}
        className={className || 'inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6'}
      >
        <ArrowLeft className="w-5 h-5" />
        {label || 'Admin Paneli'}
      </button>
    )
  }

  return (
    <button onClick={handleBack} className={className || 'p-2 rounded-lg bg-white/5 hover:bg-white/10 transition'}>
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}
