'use client'

import { useEffect, useState } from 'react'

interface Star {
  id: number
  width: number
  height: number
  left: number
  top: number
  duration: number
  delay: number
}

export default function StarBackground() {
  const [stars, setStars] = useState<Star[]>([])
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    // Generate stars only on client side to avoid hydration mismatch
    const generatedStars: Star[] = []
    for (let i = 0; i < 100; i++) {
      generatedStars.push({
        id: i,
        width: Math.random() * 3 + 1,
        height: Math.random() * 3 + 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 4 + 2,
        delay: Math.random() * 3,
      })
    }
    setStars(generatedStars)
  }, [])
  
  if (!mounted) {
    return null
  }
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white/50 animate-twinkle"
          style={{
            width: star.width + 'px',
            height: star.height + 'px',
            left: star.left + '%',
            top: star.top + '%',
            animationDuration: star.duration + 's',
            animationDelay: star.delay + 's',
          }}
        />
      ))}
      
      {/* Occasional shooting stars */}
      <div 
        className="absolute w-[2px] h-[2px] bg-white rounded-full animate-shooting-star"
        style={{
          top: '20%',
          left: '80%',
          boxShadow: '0 0 6px 2px rgba(255, 255, 255, 0.6)',
        }}
      />
      <div 
        className="absolute w-[2px] h-[2px] bg-white rounded-full animate-shooting-star-2"
        style={{
          top: '40%',
          left: '60%',
          boxShadow: '0 0 6px 2px rgba(255, 255, 255, 0.6)',
          animationDelay: '5s',
        }}
      />
    </div>
  )
}
