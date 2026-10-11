'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export type ProfileEffect = 
  | 'sparkles' | 'fire' | 'rainbow' | 'snow' | 'hearts' 
  | 'stars' | 'confetti' | 'bubbles' | 'lightning' | 'aurora'

interface ProfileEffectsProps {
  effect: ProfileEffect
  intensity?: 'low' | 'medium' | 'high'
}

export default function ProfileEffects({ effect, intensity = 'medium' }: ProfileEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const particleCount = intensity === 'low' ? 10 : intensity === 'medium' ? 20 : 35

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const createParticle = () => {
      const particle = document.createElement('div')
      particle.className = `profile-effect-particle profile-effect-${effect}`
      
      // Set random position
      particle.style.left = `${Math.random() * 100}%`
      particle.style.animationDuration = `${Math.random() * 3 + 2}s`
      particle.style.animationDelay = `${Math.random() * 2}s`
      
      container.appendChild(particle)
      
      // Remove after animation
      setTimeout(() => particle.remove(), 5000)
    }

    // Initial particles
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => createParticle(), i * 100)
    }

    // Continuous particles
    const interval = setInterval(createParticle, 500)
    return () => clearInterval(interval)
  }, [effect, particleCount])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ borderRadius: 'inherit' }}
    />
  )
}

// Animated background component
export function ProfileBackground({ effect }: { effect: ProfileEffect }) {
  const backgrounds: Record<ProfileEffect, React.ReactNode> = {
    sparkles: (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-pink-900/30 to-blue-900/50">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    ),
    fire: (
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/60 via-red-900/40 to-transparent">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-orange-500/30 to-transparent animate-pulse" />
      </div>
    ),
    rainbow: (
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 via-blue-500/20 to-purple-500/20 animate-gradient-x" />
      </div>
    ),
    snow: (
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-cyan-900/30">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/80 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: -10,
            }}
            animate={{
              y: ['0vh', '100vh'],
              x: [0, Math.random() * 50 - 25],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'linear',
            }}
          />
        ))}
      </div>
    ),
    hearts: (
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 to-red-900/40">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-400"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: -20,
              fontSize: `${Math.random() * 20 + 10}px`,
            }}
            animate={{
              y: [0, -500],
              opacity: [1, 0],
              scale: [1, 0.5],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          >
            ❤️
          </motion.div>
        ))}
      </div>
    ),
    stars: (
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 15 + 8}px`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              rotate: [0, 360],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            ⭐
          </motion.div>
        ))}
      </div>
    ),
    confetti: (
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-3 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: -10,
              backgroundColor: ['#ff0080', '#ff8c00', '#40e0d0', '#ff1493', '#00ff00', '#ffd700'][Math.floor(Math.random() * 6)],
            }}
            animate={{
              y: ['0vh', '100vh'],
              rotate: [0, Math.random() * 720 - 360],
              x: [0, Math.random() * 100 - 50],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'linear',
            }}
          />
        ))}
      </div>
    ),
    bubbles: (
      <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/30 to-blue-900/30">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/30 bg-white/10"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: -30,
              width: `${Math.random() * 30 + 10}px`,
              height: `${Math.random() * 30 + 10}px`,
            }}
            animate={{
              y: [0, -600],
              x: [0, Math.random() * 40 - 20],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>
    ),
    lightning: (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40">
        <motion.div
          className="absolute inset-0 bg-blue-400/20"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 5 + 3 }}
        />
      </div>
    ),
    aurora: (
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-purple-500/20 to-pink-500/20"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ backgroundSize: '200% 200%' }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10"
          animate={{
            backgroundPosition: ['100% 50%', '0% 50%', '100% 50%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ backgroundSize: '200% 200%' }}
        />
      </div>
    ),
  }

  return backgrounds[effect] || null
}
