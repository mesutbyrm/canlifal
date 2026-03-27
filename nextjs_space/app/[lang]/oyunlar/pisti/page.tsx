'use client'

import GameShell from '@/components/game-shell'
import { motion, AnimatePresence } from 'framer-motion'
import { pistiAI, pistiPlay } from '@/lib/game-logic'
import { useEffect, useRef, useState } from 'react'

function getCardColor(card: string) {
  if (card.includes('♥') || card.includes('♦')) return 'text-red-400'
  return 'text-white'
}

function getCardRank(card: string) {
  return card.replace(/[♠♥♦♣]/g, '')
}

function getCardSuit(card: string) {
  const m = card.match(/[♠♥♦♣]/)
  return m ? m[0] : ''
}

export default function PistiPage() {
  return (
    <GameShell
      gameType="pisti"
      gameName="Pişti"
      gameEmoji="🃏"
      gameDesc="Klasik Türk kart oyunu! Eşleştir, topla, pişti yap!"
      supportsAI={true}
    >
      {({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }) => (
        <PistiBoard room={room} state={state} isMyTurn={isMyTurn} isSpectator={isSpectator} playerNum={playerNum} sendMove={sendMove} sendAIState={sendAIState} />
      )}
    </GameShell>
  )
}

function PistiBoard({ room, state, isMyTurn, isSpectator, playerNum, sendMove, sendAIState }: any) {
  const [lastAction, setLastAction] = useState<string | null>(null)
  const aiRef = useRef<any>(null)

  const myHand: string[] = playerNum === 1 ? (state?.player1Hand || []) : (state?.player2Hand || [])
  const pile: string[] = state?.pile || []
  const deckCount = state?.deck?.length || 0
  const p1Collected = state?.player1Collected?.length || 0
  const p2Collected = state?.player2Collected?.length || 0
  const p1Pistis = state?.player1Pistis || 0
  const p2Pistis = state?.player2Pistis || 0

  // AI auto-play
  useEffect(() => {
    if (!room.isAI || room.status !== 'active' || room.currentTurn !== 2) return
    if (aiRef.current) clearTimeout(aiRef.current)
    aiRef.current = setTimeout(async () => {
      const aiIndex = pistiAI(state)
      const result = pistiPlay(state, 2, aiIndex)
      if (!result.error) {
        await sendAIState({
          state: result.state,
          player1Score: result.p1Score ?? room.player1Score,
          player2Score: result.p2Score ?? room.player2Score,
          currentTurn: result.winner || result.isDraw ? room.currentTurn : 1,
          status: result.winner || result.isDraw ? 'completed' : 'active',
          winnerId: result.winner === 1 ? room.player1Id : result.winner === 2 ? room.player2Id : null,
        })
        // Show action feedback
        const played = state.player2Hand[aiIndex]
        const topCard = pile.length > 0 ? pile[pile.length - 1] : null
        if (topCard && (getCardRank(played) === getCardRank(topCard) || getCardRank(played) === 'J')) {
          if (pile.length === 1) setLastAction('PİŞTİ! 🎉')
          else setLastAction('Toplandı!')
        } else {
          setLastAction(null)
        }
      }
    }, 1000)
    return () => { if (aiRef.current) clearTimeout(aiRef.current) }
  }, [room, state])

  const handlePlay = async (cardIndex: number) => {
    if (!isMyTurn || isSpectator || room.status !== 'active') return
    setLastAction(null)
    const card = myHand[cardIndex]
    const topCard = pile.length > 0 ? pile[pile.length - 1] : null
    if (topCard && (getCardRank(card) === getCardRank(topCard) || getCardRank(card) === 'J')) {
      if (pile.length === 1) setLastAction('PİŞTİ! 🎉')
      else setLastAction('Toplandı!')
    }
    await sendMove({ cardIndex })
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
      {/* Scores */}
      <div className="flex items-center justify-between w-full text-xs">
        <div className={`px-3 py-1 rounded-full ${room.currentTurn === 1 ? 'bg-cyan-900/30 border border-cyan-500/30' : 'bg-purple-900/20'}`}>
          <span className="text-cyan-300">{room.player1Name}</span>
          <span className="text-fuchsia-300/60 ml-1">({p1Collected} kart, {p1Pistis}🔥)</span>
        </div>
        <div className={`px-3 py-1 rounded-full ${room.currentTurn === 2 ? 'bg-pink-900/30 border border-pink-500/30' : 'bg-purple-900/20'}`}>
          <span className="text-pink-300">{room.player2Name}</span>
          <span className="text-fuchsia-300/60 ml-1">({p2Collected} kart, {p2Pistis}🔥)</span>
        </div>
      </div>

      {/* Deck + Pile area */}
      <div className="flex items-center justify-center gap-8 py-4">
        {/* Deck */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-20 sm:w-16 sm:h-22 rounded-lg bg-gradient-to-br from-indigo-800 to-purple-900 border-2 border-fuchsia-500/30 flex items-center justify-center text-xs text-fuchsia-300">
            {deckCount}
          </div>
          <span className="text-[10px] text-fuchsia-400/40 mt-0.5">Deste</span>
        </div>

        {/* Pile */}
        <div className="flex flex-col items-center relative">
          <div className="relative w-14 h-20 sm:w-16 sm:h-22">
            {pile.length > 0 ? (
              <motion.div
                key={pile[pile.length - 1] + pile.length}
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`w-14 h-20 sm:w-16 sm:h-22 rounded-lg bg-white border-2 border-gray-300 flex flex-col items-center justify-center font-bold ${getCardColor(pile[pile.length - 1])}`}
              >
                <span className="text-lg">{getCardRank(pile[pile.length - 1])}</span>
                <span className="text-sm">{getCardSuit(pile[pile.length - 1])}</span>
              </motion.div>
            ) : (
              <div className="w-14 h-20 sm:w-16 sm:h-22 rounded-lg border-2 border-dashed border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400/30 text-xs">boş</div>
            )}
          </div>
          <span className="text-[10px] text-fuchsia-400/40 mt-0.5">Açık ({pile.length})</span>
          {/* Pişti animation */}
          <AnimatePresence>
            {lastAction && (
              <motion.div
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: -30 }}
                exit={{ opacity: 0, y: -50 }}
                className="absolute -top-8 text-amber-400 font-bold text-sm whitespace-nowrap"
              >
                {lastAction}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status */}
      {isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-green-400 text-sm animate-pulse">Senin sıran! Bir kart oyna</p>
      )}
      {!isMyTurn && room.status === 'active' && !isSpectator && (
        <p className="text-fuchsia-400/60 text-sm">Rakibin oynuyor...</p>
      )}

      {/* My hand */}
      {!isSpectator && myHand.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {myHand.map((card: string, i: number) => (
            <motion.button
              key={card + i}
              whileHover={isMyTurn ? { y: -12, scale: 1.05 } : {}}
              whileTap={isMyTurn ? { scale: 0.95 } : {}}
              onClick={() => handlePlay(i)}
              disabled={!isMyTurn}
              className={`w-14 h-20 sm:w-16 sm:h-22 rounded-lg bg-white border-2 flex flex-col items-center justify-center font-bold transition-all ${
                isMyTurn
                  ? 'border-fuchsia-400 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer'
                  : 'border-gray-300 opacity-60'
              } ${getCardColor(card)}`}
            >
              <span className="text-lg">{getCardRank(card)}</span>
              <span className="text-sm">{getCardSuit(card)}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Spectator hand view */}
      {isSpectator && (
        <p className="text-fuchsia-400/40 text-xs">İzleyici modundasın - kartlar gizli</p>
      )}
    </div>
  )
}
