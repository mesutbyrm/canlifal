// ========== GAME LOGIC FOR ALL MULTIPLAYER GAMES ==========

export type GameType = 'xox' | 'tombala' | 'tavla' | 'pisti' | 'sayi_tahmin' | 'zar' | 'okey' | 'okey101'

// ========== XOX (Tic-Tac-Toe) ==========
export function xoxInit() {
  return { board: Array(9).fill('') }
}

export function xoxMove(state: any, index: number, playerNum: number) {
  const board = [...state.board]
  if (board[index] !== '') return { error: 'Hücre dolu' }
  board[index] = playerNum === 1 ? 'X' : 'O'
  const winner = xoxCheckWinner(board)
  const isFull = board.every((c: string) => c !== '')
  return { state: { board }, winner, isDraw: !winner && isFull, scored: false }
}

function xoxCheckWinner(board: string[]): number | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === 'X' ? 1 : 2
    }
  }
  return null
}

export function xoxAI(state: any): number | null {
  const board = state.board
  const empty = board.map((c: string, i: number) => c === '' ? i : -1).filter((i: number) => i >= 0)
  if (empty.length === 0) return null
  
  // Try to win
  for (const i of empty) {
    const test = [...board]; test[i] = 'O'
    if (xoxCheckWinner(test) === 2) return i
  }
  // Block player
  for (const i of empty) {
    const test = [...board]; test[i] = 'X'
    if (xoxCheckWinner(test) === 1) return i
  }
  // Center
  if (board[4] === '') return 4
  // Corners
  const corners = [0,2,6,8].filter(i => board[i] === '')
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)]
  return empty[Math.floor(Math.random() * empty.length)]
}

// ========== SAYI TAHMİN (Bulls & Cows) ==========
export function sayiTahminInit() {
  return {
    player1Number: null as string | null,
    player2Number: null as string | null,
    guesses: [] as { player: number; guess: string; bulls: number; cows: number }[],
    phase: 'picking' as 'picking' | 'guessing',
  }
}

export function sayiTahminSetNumber(state: any, playerNum: number, number: string) {
  if (!/^\d{4}$/.test(number)) return { error: 'Geçersiz sayı (4 basamak olmalı)' }
  const digits = number.split('')
  if (new Set(digits).size !== 4) return { error: 'Tüm basamaklar farklı olmalı' }
  
  const newState = { ...state }
  if (playerNum === 1) newState.player1Number = number
  else newState.player2Number = number
  
  if (newState.player1Number && newState.player2Number) {
    newState.phase = 'guessing'
  }
  return { state: newState }
}

export function sayiTahminGuess(state: any, playerNum: number, guess: string) {
  if (state.phase !== 'guessing') return { error: 'Tahmin aşamasında değil' }
  if (!/^\d{4}$/.test(guess)) return { error: 'Geçersiz tahmin' }
  if (new Set(guess.split('')).size !== 4) return { error: 'Tüm basamaklar farklı olmalı' }
  
  const target = playerNum === 1 ? state.player2Number : state.player1Number
  let bulls = 0, cows = 0
  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) bulls++
    else if (target.includes(guess[i])) cows++
  }
  
  const newState = {
    ...state,
    guesses: [...state.guesses, { player: playerNum, guess, bulls, cows }]
  }
  
  const winner = bulls === 4 ? playerNum : null
  return { state: newState, winner, isDraw: false, scored: false }
}

export function sayiTahminAI(): string {
  const digits = [0,1,2,3,4,5,6,7,8,9]
  const shuffled = digits.sort(() => Math.random() - 0.5)
  // First digit can't be 0 for cleaner UX
  if (shuffled[0] === 0) {
    const nonZero = shuffled.findIndex(d => d !== 0)
    ;[shuffled[0], shuffled[nonZero]] = [shuffled[nonZero], shuffled[0]]
  }
  return shuffled.slice(0, 4).join('')
}

export function sayiTahminAIGuess(state: any): string {
  // Simple AI: random valid guess not tried before
  const tried = new Set(state.guesses.filter((g: any) => g.player === 2).map((g: any) => g.guess))
  for (let attempt = 0; attempt < 100; attempt++) {
    const g = sayiTahminAI()
    if (!tried.has(g)) return g
  }
  return sayiTahminAI()
}

// ========== ZAR ATMA (Dice) ==========
export function zarInit() {
  return {
    rounds: [] as { player1: number[]; player2: number[] }[],
    totalRounds: 3,
    currentRound: 0,
    phase: 'ready' as 'ready' | 'p1rolled' | 'p2rolled' | 'done',
  }
}

export function zarRoll(state: any, playerNum: number) {
  const dice = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]
  const newState = { ...state }
  
  if (playerNum === 1 && state.phase === 'ready') {
    newState.rounds = [...state.rounds, { player1: dice, player2: [] }]
    newState.phase = 'p1rolled'
    newState.currentRound = state.currentRound + 1
  } else if (playerNum === 2 && state.phase === 'p1rolled') {
    const lastRound = { ...newState.rounds[newState.rounds.length - 1], player2: dice }
    newState.rounds = [...newState.rounds.slice(0, -1), lastRound]
    newState.phase = newState.currentRound >= state.totalRounds ? 'done' : 'ready'
  } else {
    return { error: 'Sıra sizde değil' }
  }
  
  // Calculate scores
  let p1 = 0, p2 = 0
  for (const r of newState.rounds) {
    const s1 = r.player1.reduce((a: number, b: number) => a + b, 0)
    const s2 = r.player2.reduce((a: number, b: number) => a + b, 0)
    if (s1 > s2) p1++
    else if (s2 > s1) p2++
  }
  
  let winner = null
  let isDraw = false
  if (newState.phase === 'done') {
    if (p1 > p2) winner = 1
    else if (p2 > p1) winner = 2
    else isDraw = true
  }
  
  return { state: newState, winner, isDraw, p1Score: p1, p2Score: p2, scored: false }
}

// ========== TOMBALA (Bingo) ==========
function generateTombalaCard(): number[][] {
  const card: number[][] = []
  for (let row = 0; row < 3; row++) {
    const rowNums: number[] = []
    const positions = [0,1,2,3,4,5,6,7,8]
    // Each row has 5 numbers and 4 blanks
    const active = positions.sort(() => Math.random() - 0.5).slice(0, 5).sort((a,b) => a-b)
    for (let col = 0; col < 9; col++) {
      if (active.includes(col)) {
        const min = col * 10 + (col === 0 ? 1 : 0)
        const max = col * 10 + 9 + (col === 0 ? 0 : 0)
        let num: number
        do {
          num = Math.floor(Math.random() * (max - min + 1)) + min
        } while (card.flat().includes(num) || rowNums.includes(num))
        rowNums.push(num)
      } else {
        rowNums.push(0) // blank
      }
    }
    card.push(rowNums)
  }
  return card
}

export function tombalaInit() {
  return {
    player1Card: generateTombalaCard(),
    player2Card: generateTombalaCard(),
    drawnNumbers: [] as number[],
    allNumbers: Array.from({length: 90}, (_, i) => i + 1).sort(() => Math.random() - 0.5),
    player1Marked: Array(27).fill(false),
    player2Marked: Array(27).fill(false),
  }
}

export function tombalaDraw(state: any) {
  if (state.drawnNumbers.length >= 90) return { error: 'Tüm sayılar çekildi' }
  const nextNum = state.allNumbers[state.drawnNumbers.length]
  const newState = {
    ...state,
    drawnNumbers: [...state.drawnNumbers, nextNum],
  }
  
  // Auto-mark for both players
  const p1Card = state.player1Card.flat()
  const p2Card = state.player2Card.flat()
  const p1Marked = [...state.player1Marked]
  const p2Marked = [...state.player2Marked]
  
  p1Card.forEach((num: number, i: number) => {
    if (num === nextNum) p1Marked[i] = true
  })
  p2Card.forEach((num: number, i: number) => {
    if (num === nextNum) p2Marked[i] = true
  })
  
  newState.player1Marked = p1Marked
  newState.player2Marked = p2Marked
  
  // Check for winner (first to complete a row)
  const checkRow = (card: number[][], marked: boolean[]) => {
    for (let row = 0; row < 3; row++) {
      let rowComplete = true
      for (let col = 0; col < 9; col++) {
        if (card[row][col] !== 0 && !marked[row * 9 + col]) {
          rowComplete = false
          break
        }
      }
      if (rowComplete) return true
    }
    return false
  }
  
  const p1Won = checkRow(state.player1Card, p1Marked)
  const p2Won = checkRow(state.player2Card, p2Marked)
  
  let winner = null
  let isDraw = false
  if (p1Won && p2Won) isDraw = true
  else if (p1Won) winner = 1
  else if (p2Won) winner = 2
  
  return { state: newState, winner, isDraw, scored: false }
}

// ========== TAVLA (Simplified Backgammon) ==========
export function tavlaInit() {
  // Standard initial setup: positive = player1 (white), negative = player2 (black)
  const board = Array(24).fill(0)
  board[0] = 2; board[5] = -5; board[7] = -3; board[11] = 5
  board[12] = -5; board[16] = 3; board[18] = 5; board[23] = -2
  
  return {
    board,
    bar: [0, 0], // [p1 on bar, p2 on bar]
    off: [0, 0], // [p1 borne off, p2 borne off]
    dice: [] as number[],
    movesLeft: [] as number[],
    phase: 'roll' as 'roll' | 'move' | 'done',
  }
}

export function tavlaRollDice(state: any, playerNum?: number) {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  const movesLeft = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2]
  const newState = { ...state, dice: [d1, d2], movesLeft, phase: 'move' as const }
  // Auto-skip if no valid moves exist
  if (playerNum && !tavlaHasAnyMove(newState, playerNum)) {
    newState.movesLeft = []
    newState.phase = 'roll'
    return { state: newState, scored: false } // No moves, turn passes
  }
  return { state: newState, scored: true } // Keep turn for moves
}

// Check if a player has any valid move with current dice
function tavlaHasAnyMove(state: any, playerNum: number): boolean {
  const sign = playerNum === 1 ? 1 : -1
  const dir = playerNum === 1 ? 1 : -1
  const movesLeft = state.movesLeft || []
  if (movesLeft.length === 0) return false

  const uniqueDice = [...new Set(movesLeft)] as number[]
  
  // Check bar moves
  if (state.bar[playerNum - 1] > 0) {
    for (const die of uniqueDice) {
      const to = playerNum === 1 ? die - 1 : 24 - die
      if (to >= 0 && to < 24 && state.board[to] * sign >= -1) return true
    }
    return false // Must move from bar first
  }

  // Check board moves
  for (let i = 0; i < 24; i++) {
    if (state.board[i] * sign <= 0) continue
    for (const die of uniqueDice) {
      const to = i + die * dir
      // Bearing off
      if ((playerNum === 1 && to >= 24) || (playerNum === 2 && to < 0)) {
        if (tavlaCanBearOff(state.board, state.bar, playerNum, sign)) return true
        continue
      }
      if (to >= 0 && to < 24 && state.board[to] * sign >= -1) return true
    }
  }
  return false
}

function tavlaCanBearOff(board: number[], bar: number[], playerNum: number, sign: number): boolean {
  if (bar[playerNum - 1] > 0) return false
  const homeStart = playerNum === 1 ? 18 : 0
  const homeEnd = playerNum === 1 ? 23 : 5
  for (let i = 0; i < 24; i++) {
    if (i >= homeStart && i <= homeEnd) continue
    if (board[i] * sign > 0) return false
  }
  return true
}

export function tavlaMove(state: any, from: number, playerNum: number) {
  const board = [...state.board]
  const bar = [...state.bar]
  const off = [...state.off]
  let movesLeft = [...state.movesLeft]
  const dir = playerNum === 1 ? 1 : -1
  const sign = playerNum === 1 ? 1 : -1
  
  if (movesLeft.length === 0) return { error: 'Hamle kalmadı' }
  
  // Enforce bar-first rule
  if (bar[playerNum - 1] > 0 && from !== -1) {
    return { error: 'Önce bar\'daki taşını çıkarmalısın' }
  }
  
  // Validate source
  if (from !== -1 && board[from] * sign <= 0) {
    return { error: 'Bu noktada taşın yok' }
  }
  
  // Find a valid move with any remaining die (try largest first for bearing off)
  let moved = false
  const sortedIndices = movesLeft.map((d, i) => i).sort((a, b) => movesLeft[b] - movesLeft[a])
  
  for (const mi of sortedIndices) {
    const die = movesLeft[mi]
    let to: number
    
    if (from === -1) {
      if (bar[playerNum - 1] <= 0) continue
      to = playerNum === 1 ? die - 1 : 24 - die
    } else {
      to = from + die * dir
    }
    
    // Bearing off
    if ((playerNum === 1 && to >= 24) || (playerNum === 2 && to < 0)) {
      if (!tavlaCanBearOff(board, bar, playerNum, sign)) continue
      
      // Exact bear off is always valid
      const exactTo = from + die * dir
      const isExact = (playerNum === 1 && exactTo === 24) || (playerNum === 2 && exactTo === -1)
      
      if (!isExact) {
        // Higher die: only valid if no piece exists further from home edge
        if (playerNum === 1) {
          // Check if any piece on points < from (further from p1 home 18-23)
          let hasFurther = false
          for (let j = 18; j < from; j++) {
            if (board[j] * sign > 0) { hasFurther = true; break }
          }
          if (hasFurther) continue
        } else {
          // P2 home is 0-5, further = higher index
          let hasFurther = false
          for (let j = from + 1; j <= 5; j++) {
            if (board[j] * sign > 0) { hasFurther = true; break }
          }
          if (hasFurther) continue
        }
      }
      
      if (from !== -1) board[from] -= sign
      off[playerNum - 1]++
      movesLeft = [...movesLeft]; movesLeft.splice(mi, 1)
      moved = true
      break
    }
    
    if (to < 0 || to >= 24) continue
    if (board[to] * sign < -1) continue // Blocked by 2+ opponent pieces
    
    // Hit opponent single piece
    if (board[to] * sign === -1) {
      board[to] = 0
      bar[playerNum === 1 ? 1 : 0]++
    }
    
    if (from === -1) {
      bar[playerNum - 1]--
    } else {
      board[from] -= sign
    }
    board[to] += sign
    movesLeft = [...movesLeft]; movesLeft.splice(mi, 1)
    moved = true
    break
  }
  
  if (!moved) {
    return { error: 'Bu taş ile geçerli hamle yok. Başka bir taş dene.' }
  }
  
  const newState = { ...state, board, bar, off, movesLeft }
  
  // If moves remain but no valid move exists for any piece, auto-skip
  if (movesLeft.length > 0 && !tavlaHasAnyMove({ board, bar, off, movesLeft }, playerNum)) {
    newState.movesLeft = []
  }
  
  const turnDone = newState.movesLeft.length === 0
  if (turnDone) {
    newState.phase = 'roll'
  }
  
  let winner = null
  if (off[0] >= 15) winner = 1
  else if (off[1] >= 15) winner = 2
  
  return { state: newState, winner, isDraw: false, scored: !turnDone } // scored=true keeps turn
}

export function tavlaAIMove(state: any): { from: number } | null {
  const board = state.board
  const sign = -1 // AI is player 2
  const movesLeft = state.movesLeft || []
  if (movesLeft.length === 0) return null
  
  // Must move from bar first
  if (state.bar[1] > 0) {
    // Check if bar move is valid with any die
    for (const die of movesLeft) {
      const to = 24 - die
      if (to >= 0 && to < 24 && board[to] * sign >= -1) return { from: -1 }
    }
    return null // Stuck on bar
  }
  
  // Try each piece, preferring ones furthest from home (index 23 down to 0 for p2 whose home is 0-5)
  for (let i = 23; i >= 0; i--) {
    if (board[i] * sign <= 0) continue
    // Check if this piece has any valid move
    for (const die of movesLeft) {
      const to = i + die * (-1) // dir for p2 is -1
      if ((to < 0) && tavlaCanBearOff(board, state.bar, 2, sign)) return { from: i }
      if (to >= 0 && to < 24 && board[to] * sign >= -1) return { from: i }
    }
  }
  return null
}

// ========== PİŞTİ ==========
const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function createDeck(): string[] {
  const deck: string[] = []
  for (const s of SUITS) for (const r of RANKS) deck.push(r + s)
  return deck.sort(() => Math.random() - 0.5)
}

export function pistiInit() {
  const deck = createDeck()
  const pile = deck.splice(0, 4)
  const player1Hand = deck.splice(0, 4)
  const player2Hand = deck.splice(0, 4)
  
  return {
    deck,
    pile,
    player1Hand,
    player2Hand,
    player1Collected: [] as string[],
    player2Collected: [] as string[],
    player1Pistis: 0,
    player2Pistis: 0,
    lastCapture: null as number | null,
  }
}

function getCardRank(card: string): string {
  return card.replace(/[♠♥♦♣]/g, '')
}

function cardValue(card: string): number {
  const r = getCardRank(card)
  if (r === 'A') return 1
  if (r === 'J') return 1
  if (r === '2' && card.includes('♣')) return 1
  if (r === '10' && card.includes('♦')) return 1
  return 0
}

export function pistiPlay(state: any, playerNum: number, cardIndex: number) {
  const hand = playerNum === 1 ? [...state.player1Hand] : [...state.player2Hand]
  if (cardIndex < 0 || cardIndex >= hand.length) return { error: 'Geçersiz kart' }
  
  const card = hand.splice(cardIndex, 1)[0]
  const pile = [...state.pile]
  const topCard = pile.length > 0 ? pile[pile.length - 1] : null
  
  let captured = false
  let isPisti = false
  let collected = playerNum === 1 ? [...state.player1Collected] : [...state.player2Collected]
  let p1Pistis = state.player1Pistis
  let p2Pistis = state.player2Pistis
  
  const playedRank = getCardRank(card)
  const topRank = topCard ? getCardRank(topCard) : null
  
  // Jack captures all, or matching rank captures
  if (topCard && (playedRank === 'J' || playedRank === topRank)) {
    captured = true
    if (pile.length === 1) {
      isPisti = true
      if (playerNum === 1) p1Pistis++
      else p2Pistis++
    }
    collected = [...collected, card, ...pile]
    pile.length = 0
  } else {
    pile.push(card)
  }
  
  const newState = { ...state, pile }
  if (playerNum === 1) {
    newState.player1Hand = hand
    newState.player1Collected = collected
    newState.player1Pistis = p1Pistis
  } else {
    newState.player2Hand = hand
    newState.player2Collected = collected
    newState.player2Pistis = p2Pistis
  }
  newState.lastCapture = captured ? playerNum : state.lastCapture
  
  // Deal new cards if both hands empty and deck has cards
  if (newState.player1Hand.length === 0 && newState.player2Hand.length === 0 && newState.deck.length > 0) {
    const deck = [...newState.deck]
    newState.player1Hand = deck.splice(0, 4)
    newState.player2Hand = deck.splice(0, 4)
    newState.deck = deck
  }
  
  // Check if game is over (both hands empty, no deck)
  let winner = null
  let isDraw = false
  if (newState.player1Hand.length === 0 && newState.player2Hand.length === 0 && newState.deck.length === 0) {
    // Remaining pile goes to last capturer
    if (newState.pile.length > 0 && newState.lastCapture) {
      if (newState.lastCapture === 1) newState.player1Collected = [...newState.player1Collected, ...newState.pile]
      else newState.player2Collected = [...newState.player2Collected, ...newState.pile]
      newState.pile = []
    }
    
    // Calculate scores
    let p1Score = newState.player1Pistis * 10
    let p2Score = newState.player2Pistis * 10
    
    for (const c of newState.player1Collected) p1Score += cardValue(c)
    for (const c of newState.player2Collected) p2Score += cardValue(c)
    
    // Most cards bonus
    if (newState.player1Collected.length > newState.player2Collected.length) p1Score += 3
    else if (newState.player2Collected.length > newState.player1Collected.length) p2Score += 3
    
    if (p1Score > p2Score) winner = 1
    else if (p2Score > p1Score) winner = 2
    else isDraw = true
    
    return { state: newState, winner, isDraw, p1Score, p2Score, scored: false }
  }
  
  return { state: newState, winner: null, isDraw: false, scored: false }
}

export function pistiAI(state: any): number {
  const hand = state.player2Hand
  if (hand.length === 0) return 0
  
  const topCard = state.pile.length > 0 ? state.pile[state.pile.length - 1] : null
  const topRank = topCard ? getCardRank(topCard) : null
  
  // Try to match
  if (topRank) {
    for (let i = 0; i < hand.length; i++) {
      if (getCardRank(hand[i]) === topRank) return i
    }
    // Try jack
    for (let i = 0; i < hand.length; i++) {
      if (getCardRank(hand[i]) === 'J') return i
    }
  }
  
  // Play random non-jack
  const nonJacks = hand.map((_: any, i: number) => i).filter((i: number) => getCardRank(hand[i]) !== 'J')
  if (nonJacks.length > 0) return nonJacks[Math.floor(Math.random() * nonJacks.length)]
  return 0
}

// ========== PROCESS MOVE ==========
export function processMove(gameType: string, state: any, action: any, playerNum: number) {
  switch (gameType) {
    case 'xox':
      return xoxMove(state, action.index, playerNum)
    case 'sayi_tahmin':
      if (action.type === 'set_number') return sayiTahminSetNumber(state, playerNum, action.number)
      return sayiTahminGuess(state, playerNum, action.guess)
    case 'zar':
      return zarRoll(state, playerNum)
    case 'tombala':
      return tombalaDraw(state)
    case 'tavla':
      if (action.type === 'roll') return tavlaRollDice(state, playerNum)
      return tavlaMove(state, action.from, playerNum)
    case 'pisti':
      return pistiPlay(state, playerNum, action.cardIndex)
    default:
      return { error: 'Bilinmeyen oyun tipi' }
  }
}

// ========== OKEY (Classic Turkish Tile Game - 4 Players) ==========
export interface OkeyTile { color: number; number: number; id: number; isFalseJoker?: boolean }

export function okeyInit() {
  // Create 106 tiles: 4 colors × 13 numbers × 2 copies + 2 false jokers
  const tiles: OkeyTile[] = []
  let id = 0
  for (let copy = 0; copy < 2; copy++) {
    for (let color = 0; color < 4; color++) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({ color, number: num, id: id++ })
      }
    }
  }
  // 2 false jokers (shown as ★)
  tiles.push({ color: 4, number: 0, id: id++, isFalseJoker: true })
  tiles.push({ color: 4, number: 0, id: id++, isFalseJoker: true })

  // Shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }

  // Pick indicator tile (gösterge)
  const indicator = tiles.pop()!
  // Joker = same color, next number (13 wraps to 1)
  const jokerColor = indicator.isFalseJoker ? 0 : indicator.color
  const jokerNumber = indicator.isFalseJoker ? 1 : (indicator.number % 13) + 1

  // Deal: seat 0 (dealer/human) gets 15, others get 14
  const hands: OkeyTile[][] = [[], [], [], []]
  hands[0] = tiles.splice(0, 15)
  hands[1] = tiles.splice(0, 14)
  hands[2] = tiles.splice(0, 14)
  hands[3] = tiles.splice(0, 14)

  // Sort each hand
  for (const h of hands) okeySortHand(h)

  return {
    pile: tiles, // remaining draw pile
    hands,
    discards: [[], [], [], []] as OkeyTile[][],
    indicator,
    jokerColor,
    jokerNumber,
    currentSeat: 0, // dealer starts
    phase: 'discard' as 'draw' | 'discard', // dealer has 15 tiles, must discard first
    winner: null as number | null,
    lastDrew: null as string | null, // 'pile' | 'discard' | null
    gameOver: false,
  }
}

function okeySortHand(hand: OkeyTile[]) {
  hand.sort((a, b) => {
    if (a.isFalseJoker && !b.isFalseJoker) return 1
    if (!a.isFalseJoker && b.isFalseJoker) return -1
    if (a.color !== b.color) return a.color - b.color
    return a.number - b.number
  })
}

function okeyIsJoker(tile: OkeyTile, jc: number, jn: number): boolean {
  return !!tile.isFalseJoker || (tile.color === jc && tile.number === jn)
}

export function okeyDraw(state: any, seat: number, source: 'pile' | 'discard') {
  if (state.phase !== 'draw' || state.currentSeat !== seat) return { error: 'Sıra değil', state }
  const s = JSON.parse(JSON.stringify(state))
  if (source === 'pile') {
    if (s.pile.length === 0) return { error: 'Yığın bitti', state }
    const tile = s.pile.pop()
    s.hands[seat].push(tile)
  } else {
    // Draw from previous player's discard pile (top card)
    const prevSeat = (seat + 3) % 4
    if (s.discards[prevSeat].length === 0) return { error: 'Atık yığını boş', state }
    const tile = s.discards[prevSeat].pop()
    s.hands[seat].push(tile)
  }
  s.phase = 'discard'
  s.lastDrew = source
  return { state: s }
}

export function okeyDiscard(state: any, seat: number, tileId: number) {
  if (state.phase !== 'discard' || state.currentSeat !== seat) return { error: 'Sıra değil', state }
  const s = JSON.parse(JSON.stringify(state))
  const hand = s.hands[seat]
  const idx = hand.findIndex((t: OkeyTile) => t.id === tileId)
  if (idx === -1) return { error: 'Taş bulunamadı', state }
  const [discarded] = hand.splice(idx, 1)
  s.discards[seat].push(discarded)

  // Check if next player has tiles (game continues)
  const nextSeat = (seat + 1) % 4
  s.currentSeat = nextSeat
  s.phase = 'draw'
  s.lastDrew = null

  // If pile is empty, game is a draw
  if (s.pile.length === 0) {
    s.gameOver = true
  }
  return { state: s }
}

export function okeyCheckWin(hand: OkeyTile[], jc: number, jn: number): boolean {
  // Standard okey: 14 tiles, 101 okey: 21 tiles
  if (hand.length !== 14 && hand.length !== 21) return false

  // Count jokers and build grid
  const grid: number[][] = Array.from({ length: 4 }, () => Array(13).fill(0))
  let jokers = 0
  for (const t of hand) {
    if (okeyIsJoker(t, jc, jn)) jokers++
    else grid[t.color][t.number - 1]++
  }

  // Check pairs (7 pairs for 14 tiles, 10 pairs + 1 tile for 21 tiles)
  if (hand.length === 14 && okeyCheck7Pairs(grid, jokers)) return true

  // Check groups (runs + sets) via backtracking
  return okeySolveGroups(grid, jokers)
}

function okeyCheck7Pairs(grid: number[][], jokers: number): boolean {
  let pairs = 0, singles = 0
  for (let c = 0; c < 4; c++) {
    for (let n = 0; n < 13; n++) {
      pairs += Math.floor(grid[c][n] / 2)
      singles += grid[c][n] % 2
    }
  }
  // Each unpaired tile needs a joker to form a pair
  return pairs + Math.floor((singles + jokers) / 2) >= 7 && singles <= jokers
}

function okeySolveGroups(grid: number[][], jokers: number): boolean {
  // Find first non-zero cell
  for (let c = 0; c < 4; c++) {
    for (let n = 0; n < 13; n++) {
      if (grid[c][n] <= 0) continue

      // Try RUNS: same color, consecutive numbers starting at n
      for (let len = 3; len <= 13 - n; len++) {
        let needed = 0
        let valid = true
        for (let i = 0; i < len; i++) {
          if (grid[c][n + i] <= 0) needed++
        }
        if (needed > jokers) continue

        // Remove run
        const removed: number[] = []
        for (let i = 0; i < len; i++) {
          if (grid[c][n + i] > 0) { grid[c][n + i]--; removed.push(i) }
        }
        if (okeySolveGroups(grid, jokers - needed)) {
          for (const i of removed) grid[c][n + i]++
          return true
        }
        for (const i of removed) grid[c][n + i]++
      }

      // Try SETS: same number, different colors (size 3 or 4)
      const avail: number[] = []
      for (let c2 = 0; c2 < 4; c2++) {
        if (grid[c2][n] > 0) avail.push(c2)
      }

      for (let sz = 3; sz <= 4; sz++) {
        if (avail.length > sz) {
          // Pick combos of sz from avail that include c
          const combos = okeyCombos(avail, sz).filter(cb => cb.includes(c))
          for (const combo of combos) {
            for (const cc of combo) grid[cc][n]--
            if (okeySolveGroups(grid, jokers)) {
              for (const cc of combo) grid[cc][n]++
              return true
            }
            for (const cc of combo) grid[cc][n]++
          }
        } else if (avail.length === sz) {
          for (const cc of avail) grid[cc][n]--
          if (okeySolveGroups(grid, jokers)) {
            for (const cc of avail) grid[cc][n]++
            return true
          }
          for (const cc of avail) grid[cc][n]++
        } else if (avail.length < sz && avail.length + jokers >= sz) {
          const need = sz - avail.length
          for (const cc of avail) grid[cc][n]--
          if (okeySolveGroups(grid, jokers - need)) {
            for (const cc of avail) grid[cc][n]++
            return true
          }
          for (const cc of avail) grid[cc][n]++
        }
      }

      return false // This tile must be in SOME group, none worked
    }
  }
  return true // All tiles placed
}

function okeyCombos(arr: number[], k: number): number[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = okeyCombos(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = okeyCombos(rest, k)
  return [...withFirst, ...withoutFirst]
}

// Score: sum of ungrouped tiles (lower is better, 0 = winner)
export function okeyHandScore(hand: OkeyTile[], jc: number, jn: number): number {
  if (okeyCheckWin(hand, jc, jn)) return 0
  // Score = sum of tile values that don't fit in groups
  // Simple heuristic: count tiles not in any partial group
  let score = 0
  for (const t of hand) {
    if (okeyIsJoker(t, jc, jn)) continue // jokers are always useful
    score += t.number // higher numbers = more penalty
  }
  return score
}

// AI Bot for Okey - supports difficulty levels
export function okeyAIMove(state: any): { action: 'draw'; source: 'pile' | 'discard' } | { action: 'discard'; tileId: number } | null {
  const seat = state.currentSeat
  const hand = state.hands[seat] as OkeyTile[]
  const jc = state.jokerColor
  const jn = state.jokerNumber
  const diff: string = state.difficulty || 'medium'

  if (state.phase === 'draw') {
    const prevSeat = (seat + 3) % 4
    const discardPile = state.discards[prevSeat] || []
    if (discardPile.length > 0) {
      const topDiscard = discardPile[discardPile.length - 1]
      const usefulness = okeyTileUsefulness(topDiscard, hand, jc, jn)
      // Easy: rarely picks from discard; Medium: threshold 6; Hard: threshold 3
      const threshold = diff === 'easy' ? 12 : diff === 'hard' ? 3 : 6
      if (usefulness > threshold) {
        return { action: 'draw', source: 'discard' }
      }
    }
    return { action: 'draw', source: 'pile' }
  }

  if (state.phase === 'discard') {
    if (diff === 'easy') {
      // Easy: discard somewhat randomly - pick from bottom 60% of usefulness
      const scored = hand.map((t: OkeyTile, i: number) => ({
        idx: i, score: okeyIsJoker(t, jc, jn) ? 9999 : okeyTileUsefulness(t, hand, jc, jn)
      })).sort((a: any, b: any) => a.score - b.score)
      const pool = scored.filter((s: any) => s.score < 9999).slice(0, Math.max(3, Math.ceil(scored.length * 0.6)))
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)]
        return { action: 'discard', tileId: hand[pick.idx].id }
      }
    }

    if (diff === 'hard') {
      // Hard: also avoids discarding tiles opponents might want
      let worstIdx = -1
      let worstScore = Infinity
      for (let i = 0; i < hand.length; i++) {
        const t = hand[i]
        if (okeyIsJoker(t, jc, jn)) continue
        let score = okeyTileUsefulness(t, hand, jc, jn)
        // Penalize discarding tiles others might need (check their discards for adjacent)
        for (let s = 0; s < 4; s++) {
          if (s === seat) continue
          const dPile = state.discards[s] || []
          for (const d of dPile.slice(-3)) {
            if (d.color === t.color && Math.abs(d.number - t.number) <= 1) score += 2
            if (d.number === t.number) score += 1
          }
        }
        if (score < worstScore) { worstScore = score; worstIdx = i }
      }
      if (worstIdx !== -1) return { action: 'discard', tileId: hand[worstIdx].id }
    }

    // Medium (default): find least useful
    let worstIdx = -1
    let worstScore = Infinity
    for (let i = 0; i < hand.length; i++) {
      const t = hand[i]
      if (okeyIsJoker(t, jc, jn)) continue
      const score = okeyTileUsefulness(t, hand, jc, jn)
      if (score < worstScore) { worstScore = score; worstIdx = i }
    }
    if (worstIdx === -1) worstIdx = 0
    return { action: 'discard', tileId: hand[worstIdx].id }
  }
  return null
}

// Okey101 scoring: calculate penalty for tiles in hand
export function okey101CalcPenalty(hand: OkeyTile[], jc: number, jn: number): number {
  let penalty = 0
  for (const t of hand) {
    if (t.isFalseJoker) { penalty += 20; continue }
    if (okeyIsJoker(t, jc, jn)) { penalty += 25; continue } // caught with joker = heavy penalty
    penalty += t.number // tile face value
  }
  return penalty
}

// Init for 101 Okey variant (multi-round, cumulative scoring, 21 tiles per player)
export function okey101Init(difficulty?: string): any {
  // Create 106 tiles same as normal okey
  const tiles: OkeyTile[] = []
  let id = 0
  for (let copy = 0; copy < 2; copy++) {
    for (let color = 0; color < 4; color++) {
      for (let num = 1; num <= 13; num++) {
        tiles.push({ color, number: num, id: id++ })
      }
    }
  }
  tiles.push({ color: 4, number: 0, id: id++, isFalseJoker: true })
  tiles.push({ color: 4, number: 0, id: id++, isFalseJoker: true })

  // Shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }

  const indicator = tiles.pop()!
  const jokerColor = indicator.isFalseJoker ? 0 : indicator.color
  const jokerNumber = indicator.isFalseJoker ? 1 : (indicator.number % 13) + 1

  // Deal: 21 tiles to each player (seat 0 gets 22, must discard first)
  const hands: OkeyTile[][] = [[], [], [], []]
  hands[0] = tiles.splice(0, 22)
  hands[1] = tiles.splice(0, 21)
  hands[2] = tiles.splice(0, 21)
  hands[3] = tiles.splice(0, 21)

  for (const h of hands) okeySortHand(h)

  return {
    pile: tiles,
    hands,
    discards: [[], [], [], []] as OkeyTile[][],
    indicator,
    jokerColor,
    jokerNumber,
    currentSeat: 0,
    phase: 'discard' as 'draw' | 'discard',
    winner: null as number | null,
    lastDrew: null as string | null,
    gameOver: false,
    variant: '101',
    difficulty: difficulty || 'medium',
    scores: [0, 0, 0, 0],
    round: 1,
    roundHistory: [] as any[],
    eliminated: [false, false, false, false],
  }
}

// Start new round in 101 Okey
export function okey101NewRound(prevState: any): any {
  const fresh = okey101Init(prevState.difficulty)
  return {
    ...fresh,
    scores: [...prevState.scores],
    round: prevState.round + 1,
    roundHistory: [...(prevState.roundHistory || [])],
    eliminated: [...(prevState.eliminated || [false, false, false, false])],
  }
}

function okeyTileUsefulness(tile: OkeyTile, hand: OkeyTile[], jc: number, jn: number): number {
  if (okeyIsJoker(tile, jc, jn)) return 100 // jokers are invaluable
  let score = 0
  for (const t of hand) {
    if (t.id === tile.id) continue
    if (okeyIsJoker(t, jc, jn)) continue
    // Same color, adjacent number = run potential
    if (t.color === tile.color && Math.abs(t.number - tile.number) <= 2) score += 3
    if (t.color === tile.color && Math.abs(t.number - tile.number) === 1) score += 4
    // Same number, different color = set potential
    if (t.number === tile.number && t.color !== tile.color) score += 5
  }
  return score
}

export function getInitialState(gameType: string) {
  switch (gameType) {
    case 'xox': return xoxInit()
    case 'sayi_tahmin': return sayiTahminInit()
    case 'zar': return zarInit()
    case 'tombala': return tombalaInit()
    case 'tavla': return tavlaInit()
    case 'pisti': return pistiInit()
    case 'okey': return okeyInit()
    case 'okey101': return okey101Init()
    default: return {}
  }
}
