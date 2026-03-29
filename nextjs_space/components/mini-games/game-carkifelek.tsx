'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

const SEGMENTS = [
  { label: '10 CFC', value: 10, color: '#9333ea' },
  { label: '25 CFC', value: 25, color: '#db2777' },
  { label: '5 CFC', value: 5, color: '#7c3aed' },
  { label: '50 CFC', value: 50, color: '#f59e0b' },
  { label: '15 CFC', value: 15, color: '#6366f1' },
  { label: '100 CFC', value: 100, color: '#ef4444' },
  { label: '20 CFC', value: 20, color: '#8b5cf6' },
  { label: 'Boş', value: 0, color: '#374151' },
  { label: '30 CFC', value: 30, color: '#ec4899' },
  { label: '75 CFC', value: 75, color: '#10b981' },
  { label: '10 CFC', value: 10, color: '#a855f7' },
  { label: '40 CFC', value: 40, color: '#f97316' },
]

interface Props {
  onComplete: (score: number) => void
}

export default function GameCarkifelek({ onComplete }: Props) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ label: string; value: number } | null>(null)
  const submitted = useRef(false)

  const segAngle = 360 / SEGMENTS.length

  const spin = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    setResult(null)

    const spins = 5 + Math.random() * 5
    const extraDeg = Math.random() * 360
    const totalRotation = rotation + spins * 360 + extraDeg
    setRotation(totalRotation)

    setTimeout(() => {
      const normalizedDeg = totalRotation % 360
      const segIndex = Math.floor(((360 - normalizedDeg + segAngle / 2) % 360) / segAngle) % SEGMENTS.length
      const segment = SEGMENTS[segIndex]
      setResult(segment)
      setSpinning(false)

      if (segment.value > 0 && !submitted.current) {
        submitted.current = true
        onComplete(segment.value)
      }
    }, 4000)
  }, [spinning, rotation, segAngle, onComplete])

  const radius = 120
  const cx = 140, cy = 140

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 text-amber-400 text-2xl">▼</div>

        {/* Wheel */}
        <motion.svg
          width="280" height="280" viewBox="0 0 280 280"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
          className="drop-shadow-lg"
        >
          {SEGMENTS.map((seg, i) => {
            const startAngle = (i * segAngle - 90) * Math.PI / 180
            const endAngle = ((i + 1) * segAngle - 90) * Math.PI / 180
            const x1 = cx + radius * Math.cos(startAngle)
            const y1 = cy + radius * Math.sin(startAngle)
            const x2 = cx + radius * Math.cos(endAngle)
            const y2 = cy + radius * Math.sin(endAngle)
            const largeArc = segAngle > 180 ? 1 : 0
            const midAngle = ((i + 0.5) * segAngle - 90) * Math.PI / 180
            const tx = cx + (radius * 0.65) * Math.cos(midAngle)
            const ty = cy + (radius * 0.65) * Math.sin(midAngle)
            const textRotate = (i + 0.5) * segAngle

            return (
              <g key={i}>
                <path
                  d={`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="#1a0a2e"
                  strokeWidth="1.5"
                />
                <text
                  x={tx} y={ty}
                  fill="white"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotate}, ${tx}, ${ty})`}
                >
                  {seg.label}
                </text>
              </g>
            )
          })}
          <circle cx={cx} cy={cy} r="18" fill="#1a0a2e" stroke="#f59e0b" strokeWidth="3" />
          <text x={cx} y={cy} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">🎡</text>
        </motion.svg>
      </div>

      {result && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className={`font-bold text-lg ${result.value > 0 ? 'text-amber-300' : 'text-fuchsia-300/60'}`}>
            {result.value > 0 ? `🎉 ${result.label} Kazandın!` : '😔 Boş geldi...'}
          </p>
        </motion.div>
      )}

      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-full hover:scale-105 transition disabled:opacity-50 shadow-lg"
      >
        {spinning ? '🎡 Dönüyor...' : '🎡 Çarkı Çevir'}
      </button>
    </div>
  )
}
