'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Sparkles className="w-12 h-12 text-gold-500" />
      </motion.div>
      {message && (
        <p className="text-deep-purple-300 text-center">{message}</p>
      )}
    </div>
  )
}
