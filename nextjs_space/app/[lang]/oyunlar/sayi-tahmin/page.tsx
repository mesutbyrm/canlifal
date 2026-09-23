'use client'

import GameShell from '@/components/game-shell'
import { motion } from 'framer-motion'
import { sayiTahminAI, sayiTahminAIGuess, sayiTahminSetNumber, sayiTahminGuess } from '@/lib/game-logic'
import { useState, useEffect, useRef } from 'react'

export default function SayiTahminPage() {
  return (
    <GameShell
      gameType="sayi_tahmin"
      gameName="Sayı Tahmin"
      gameEmoji="🔢"
      gameDesc="4 basamaklı gizli sayıyı bul! Bulls & Cows mantığıyla."
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <SayiTahminBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function SayiTahminBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const aiRef = useRef<any>(null)

  // AI: set number and make guesses (supports AI as either player for disconnect takeover)
  const aiPlayerNum = room.disconnectedPlayerId === room.player1Id ? 1 : 2
  const humanPlayerNum = aiPlayerNum === 1 ? 2 : 1
  useEffect(() => {
    if (!room.isAI || room.status !== 'active') return
    if (aiRef.current) clearTimeout(aiRef.current)

    // AI needs to set number
    const aiNumberField = aiPlayerNum === 1 ? 'player1Number' : 'player2Number'
    const humanNumberField = humanPlayerNum === 1 ? 'player1Number' : 'player2Number'
    if (state.phase === 'picking' && !state[aiNumberField]) {
      aiRef.current = setTimeout(async () => {
        const aiNum = sayiTahminAI()
        const result = sayiTahminSetNumber(state, aiPlayerNum, aiNum)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: state[humanNumberField] ? humanPlayerNum : room.currentTurn,
            status: 'active',
            winnerId: null,
          })
        }
      }, 500)
    }

    // AI needs to guess
    if (state.phase === 'guessing' && room.currentTurn === aiPlayerNum) {
      aiRef.current = setTimeout(async () => {
        const guess = sayiTahminAIGuess(state)
        const result = sayiTahminGuess(state, aiPlayerNum, guess)
        if (!result.error) {
          await sendAIState({
            state: result.state,
            player1Score: room.player1Score,
            player2Score: room.player2Score,
            currentTurn: result.winner ? room.currentTurn : humanPlayerNum,
            status: result.winner ? 'completed' : 'active',
            winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
          })
        }
      }, 1200)
    }

    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state, aiPlayerNum, humanPlayerNum])

  const handleSubmit = async () => {
    setError('')
    if (!/^\d{4}$/.test(input)) { setError('4 basamaklı bir sayı girin'); return }
    if (new Set(input.split('')).size !== 4) { setError('Tüm basamaklar farklı olmalı'); return }

    if (state.phase === 'picking') {
      await sendMove({ type: 'set_number', number: input })
    } else {
      await sendMove({ guess: input })
    }
    setInput('')
  }

  const phase = state?.phase || 'picking'
  const myNumberSet = playerNum === 1 ? state?.player1Number : state?.player2Number
  const guesses = state?.guesses || []
  const myGuesses = guesses.filter((g: any) => g.player === playerNum)
  const opGuesses = guesses.filter((g: any) => g.player !== playerNum)

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* Phase Info */}
      <div className="text-center">
        {phase === 'picking' && !myNumberSet && !isSpectator && (
          <p className="text-amber-300 text-sm animate-pulse">🔒 Gizli 4 basamaklı sayını belirle!</p>
        )}
        {phase === 'picking' && myNumberSet && (
          <p className="text-fuchsia-300/60 text-sm">Sayın: <span className="text-cyan-400 font-mono font-bold">{myNumberSet}</span> — Rakip seçiyor...</p>
        )}
        {phase === 'guessing' && isMyTurn && !isSpectator && (
          <p className="text-green-400 text-sm animate-pulse">Senin sıran! Rakibin sayısını tahmin et</p>
        )}
        {phase === 'guessing' && !isMyTurn && !isSpectator && (
          <p className="text-fuchsia-400/60 text-sm">Rakip tahmin ediyor...</p>
        )}
      </div>

      {/* Input */}
      {!isSpectator && (
        (phase === 'picking' && !myNumberSet) || (phase === 'guessing' && isMyTurn)
      ) && (
        <div className="flex gap-2 w-full">
          <input
            type="text"
            maxLength={4}
            value={input}
            onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={phase === 'picking' ? 'Gizli sayı (4 hane)' : 'Tahmin (4 hane)'}
            className="flex-1 px-4 py-3 bg-purple-900/40 border border-fuchsia-500/30 rounded-xl text-white text-center font-mono text-xl tracking-widest focus:outline-none focus:border-cyan-400"
          />
          <button onClick={handleSubmit} className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition">
            {phase === 'picking' ? '🔒' : '🎯'}
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {/* Guess History */}
      {guesses.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-fuchsia-300 text-xs font-bold">📋 Tahmin Geçmişi</p>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {guesses.map((g: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: g.player === playerNum ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  g.player === playerNum
                    ? 'bg-cyan-900/20 border border-cyan-500/20'
                    : 'bg-pink-900/20 border border-pink-500/20'
                }`}
              >
                <span className="text-fuchsia-300/60 text-xs">{g.player === playerNum ? 'Sen' : 'Rakip'}</span>
                <span className="font-mono font-bold text-white tracking-wider">{g.guess}</span>
                <div className="flex gap-2">
                  <span className="text-green-400 font-bold">{g.bulls}🎯</span>
                  <span className="text-amber-400 font-bold">{g.cows}🐄</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="text-xs text-fuchsia-400/50 text-center space-y-0.5">
        <p>🎯 Boğa = Doğru rakam, doğru yer</p>
        <p>🐄 İnek = Doğru rakam, yanlış yer</p>
      </div>
    </div>
  )
}
