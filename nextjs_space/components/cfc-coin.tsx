'use client'

import React from 'react'

interface CfcCoinProps {
  size?: number
  className?: string
}

export default function CfcCoin({ size = 24, className = '' }: CfcCoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring - gold border */}
      <circle cx="50" cy="50" r="48" fill="url(#coinGradient)" stroke="url(#borderGradient)" strokeWidth="3" />
      
      {/* Inner shadow ring */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      
      {/* Inner circle with darker gold */}
      <circle cx="50" cy="50" r="40" fill="url(#innerGradient)" />
      
      {/* Shine effect */}
      <ellipse cx="38" cy="32" rx="18" ry="12" fill="rgba(255,255,255,0.15)" transform="rotate(-20, 38, 32)" />
      
      {/* CFC text */}
      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Arial Black', 'Helvetica Neue', sans-serif"
        fontWeight="900"
        fontSize="30"
        fill="url(#textGradient)"
        stroke="rgba(120,70,0,0.5)"
        strokeWidth="1"
        letterSpacing="-1"
      >
        CFC
      </text>
      
      {/* Small sparkle dots */}
      <circle cx="22" cy="25" r="2" fill="rgba(255,255,200,0.7)" />
      <circle cx="75" cy="70" r="1.5" fill="rgba(255,255,200,0.5)" />
      <circle cx="78" cy="30" r="1" fill="rgba(255,255,200,0.4)" />
      
      <defs>
        {/* Main coin gradient */}
        <radialGradient id="coinGradient" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#C8860A" />
        </radialGradient>
        
        {/* Border gradient */}
        <linearGradient id="borderGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="50%" stopColor="#DAA520" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        
        {/* Inner gradient */}
        <radialGradient id="innerGradient" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FFDF50" />
          <stop offset="40%" stopColor="#F0C040" />
          <stop offset="100%" stopColor="#D4950A" />
        </radialGradient>
        
        {/* Text gradient */}
        <linearGradient id="textGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B4513" />
          <stop offset="50%" stopColor="#5C2D00" />
          <stop offset="100%" stopColor="#3E1A00" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Inline small version for text
export function CfcCoinInline({ size = 16, className = '' }: CfcCoinProps) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ verticalAlign: 'middle' }}>
      <CfcCoin size={size} />
    </span>
  )
}
