'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

// Dice sound via Web Audio API
export function playDiceSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    // Simulate dice rolling clatter - multiple short bursts
    const noises = [0, 0.06, 0.12, 0.2, 0.3, 0.42]
    noises.forEach((t, i) => {
      const dur = 0.04 + Math.random() * 0.03
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let j = 0; j < data.length; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / data.length) * (0.3 + Math.random() * 0.2)
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.15 - i * 0.02, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
      // Bandpass filter for more realistic sound
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 800 + Math.random() * 1200
      filter.Q.value = 1.5
      src.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      src.start(ctx.currentTime + t)
    })
    // Final thud/settle
    const thudBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
    const thudData = thudBuf.getChannelData(0)
    for (let j = 0; j < thudData.length; j++) {
      thudData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / thudData.length, 3) * 0.4
    }
    const thudSrc = ctx.createBufferSource()
    thudSrc.buffer = thudBuf
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.5)
    thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 600
    thudSrc.connect(lowpass)
    lowpass.connect(thudGain)
    thudGain.connect(ctx.destination)
    thudSrc.start(ctx.currentTime + 0.5)
  } catch {}
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

function DiceFace({ value, size = 48, color = 'white' }: { value: number; size?: number; color?: string }) {
  const dots = DOT_POSITIONS[value] || []
  const dotSize = size * 0.14
  const bgColor = color === 'white' ? 'bg-white' : 'bg-gray-900'
  const dotColor = color === 'white' ? 'bg-gray-900' : 'bg-white'
  const borderColor = color === 'white' ? 'border-gray-300' : 'border-gray-600'
  const shadow = color === 'white'
    ? 'shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.3)]'
    : 'shadow-[inset_0_-2px_4px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)]'

  return (
    <div
      className={`${bgColor} ${shadow} border-2 ${borderColor} relative`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className={`${dotColor} rounded-full absolute`}
          style={{
            width: dotSize,
            height: dotSize,
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

export function DiceRollAnimation({
  dice,
  rolling,
  size = 52,
  color = 'white',
}: {
  dice: number[]
  rolling: boolean
  size?: number
  color?: string
}) {
  const [displayDice, setDisplayDice] = useState<number[]>(dice)
  const [isAnimating, setIsAnimating] = useState(false)

  const soundPlayed = useRef(false)

  useEffect(() => {
    if (rolling) {
      setIsAnimating(true)
      // Play dice sound
      if (!soundPlayed.current) {
        soundPlayed.current = true
        playDiceSound()
      }
      // Rapid random faces during animation
      let count = 0
      const iv = setInterval(() => {
        setDisplayDice(dice.map(() => Math.floor(Math.random() * 6) + 1))
        count++
        if (count >= 8) {
          clearInterval(iv)
          setDisplayDice(dice)
          setTimeout(() => setIsAnimating(false), 200)
        }
      }, 80)
      return () => clearInterval(iv)
    } else {
      setDisplayDice(dice)
      soundPlayed.current = false
    }
  }, [dice, rolling])

  return (
    <div className="flex items-center gap-3 justify-center">
      {displayDice.map((d, i) => (
        <motion.div
          key={i}
          animate={
            isAnimating
              ? {
                  rotate: [0, 90, 180, 270, 360],
                  scale: [1, 1.2, 0.9, 1.1, 1],
                  y: [0, -20, 5, -10, 0],
                }
              : { rotate: 0, scale: 1, y: 0 }
          }
          transition={
            isAnimating
              ? { duration: 0.6, ease: 'easeOut' }
              : { duration: 0.3 }
          }
        >
          <DiceFace value={d} size={size} color={color} />
        </motion.div>
      ))}
    </div>
  )
}

export function DiceButton({
  onRoll,
  disabled,
  label = '🎲 Zar At',
}: {
  onRoll: () => void
  disabled: boolean
  label?: string
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.92 }}
      onClick={onRoll}
      disabled={disabled}
      className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </motion.button>
  )
}
