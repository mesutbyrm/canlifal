'use client'

import { useSiteTheme } from '@/lib/theme-context'
import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ThemeToggle() {
  const { colorMode, toggleColorMode } = useSiteTheme()
  const isLight = colorMode === 'light'

  return (
    <button
      onClick={toggleColorMode}
      className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300"
      style={{
        background: isLight
          ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
          : 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.2))',
        border: isLight
          ? '2px solid rgba(251, 191, 36, 0.6)'
          : '2px solid rgba(217, 70, 239, 0.5)',
        boxShadow: isLight
          ? '0 0 12px rgba(251, 191, 36, 0.4)'
          : '0 0 12px rgba(217, 70, 239, 0.3)',
      }}
      aria-label={isLight ? 'Karanlık moda geç' : 'Aydınlık moda geç'}
      title={isLight ? 'Karanlık Mod' : 'Aydınlık Mod'}
    >
      <AnimatePresence mode="wait">
        {isLight ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
          >
            <Moon className="w-5 h-5 text-amber-800" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
          >
            <Sun className="w-5 h-5 text-fuchsia-300" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
