'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const QUESTIONS = [
  { q: 'Dünyanın en büyük okyanusu hangisidir?', opts: ['Atlas', 'Hint', 'Büyük', 'Kuzey Buz'], ans: 2 },
  { q: 'Türkiye\'nin başkenti neresidir?', opts: ['İstanbul', 'Ankara', 'İzmir', 'Bursa'], ans: 1 },
  { q: 'Insan vücudundaki en büyük organ hangisidir?', opts: ['Karaciğer', 'Beyin', 'Deri', 'Kalp'], ans: 2 },
  { q: 'Suyun kimyasal formülü nedir?', opts: ['CO2', 'H2O', 'NaCl', 'O2'], ans: 1 },
  { q: 'Güneş sistemimizdeki en büyük gezegen hangisidir?', opts: ['Satürn', 'Mars', 'Jüpiter', 'Uranüs'], ans: 2 },
  { q: 'Mona Lisa tablosunu kim yapmıştır?', opts: ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'], ans: 2 },
  { q: 'Pi sayısının ilk 2 basamağı nedir?', opts: ['3.14', '2.71', '1.61', '3.33'], ans: 0 },
  { q: 'DNA\'nın açılımı nedir?', opts: ['Deoksiribonukleik Asit', 'Dinitrojen Asit', 'Deoksiribonik Asit', 'Dinukleotik Asit'], ans: 0 },
  { q: 'Işık hızı yaklaşık kaç km/s\'dir?', opts: ['300.000', '150.000', '500.000', '1.000.000'], ans: 0 },
  { q: 'Ay\'a ilk adım atan astronot kimdir?', opts: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'John Glenn'], ans: 2 },
  { q: 'İstanbul Boğazı hangi kıtaları ayırır?', opts: ['Avrupa-Asya', 'Avrupa-Afrika', 'Asya-Afrika', 'Asya-Avustralya'], ans: 0 },
  { q: 'Dumanın rengi genelde nedir?', opts: ['Beyaz', 'Gri', 'Siyah', 'Hepsine göre değişir'], ans: 3 },
  { q: 'Hangi element sembolü "Au" dur?', opts: ['Gümüş', 'Alüminyum', 'Altın', 'Bakır'], ans: 2 },
  { q: 'Olimpiyat halkası kaç tanedir?', opts: ['3', '4', '5', '6'], ans: 2 },
  { q: 'Dünyanın en uzun nehri hangisidir?', opts: ['Amazon', 'Nil', 'Mississippi', 'Yançe'], ans: 1 },
  { q: 'Bir üçgende iç açılar toplamı kaç derecedir?', opts: ['90', '180', '270', '360'], ans: 1 },
  { q: 'Hangisi bir programlama dilidir?', opts: ['HTML', 'CSS', 'Python', 'SQL'], ans: 2 },
  { q: 'Fotosentizdeki ana pigment nedir?', opts: ['Melanin', 'Klorofil', 'Hemoglobin', 'Keratin'], ans: 1 },
  { q: 'Everest Dağı hangi ülkededir?', opts: ['Hindistan', 'Nepal', 'Çin', 'Tibet'], ans: 1 },
  { q: 'Hangi gezegen Güneş\'e en yakındır?', opts: ['Venüs', 'Mars', 'Merkür', 'Dünya'], ans: 2 },
]

interface QuizProps { onComplete: (score: number) => void }

export default function GameQuiz({ onComplete }: QuizProps) {
  const [questions] = useState(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 10)
  })
  const [qIdx, setQIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [finished, setFinished] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [timer, setTimer] = useState(15)

  // Timer
  useEffect(() => {
    if (finished || showResult) return
    if (timer <= 0) { handleAnswer(-1); return }
    const t = setTimeout(() => setTimer(prev => prev - 1), 1000)
    return () => clearTimeout(t)
  }, [timer, finished, showResult])

  const handleAnswer = useCallback((idx: number) => {
    if (showResult || finished) return
    setSelected(idx)
    setShowResult(true)
    const correct = idx === questions[qIdx].ans
    const newScore = correct ? score + 10 : score
    if (correct) setScore(newScore)

    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        setFinished(true)
        if (!completed) {
          setCompleted(true)
          setTimeout(() => onComplete(newScore), 300)
        }
      } else {
        setQIdx(qIdx + 1)
        setSelected(null)
        setShowResult(false)
        setTimer(15)
      }
    }, 1500)
  }, [showResult, finished, qIdx, questions, score, completed, onComplete])

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 p-4">
        <div className="text-4xl">🏆</div>
        <div className="text-xl font-bold text-amber-300">Quiz Tamamlandı!</div>
        <div className="text-3xl font-bold text-white">{score} / {questions.length * 10}</div>
        <div className="text-sm text-fuchsia-300/60">{score >= 80 ? 'Mükemmel! 🌟' : score >= 50 ? 'İyi gidiyorsun! 👍' : 'Daha iyisini yapabilirsin! 💪'}</div>
      </motion.div>
    )
  }

  const q = questions[qIdx]

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full max-w-sm">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs text-fuchsia-300/60">Soru {qIdx + 1}/{questions.length}</span>
        <span className="text-xs text-amber-300 font-bold">Puan: {score}</span>
        <span className={`text-xs font-bold ${timer <= 5 ? 'text-red-400 animate-pulse' : 'text-fuchsia-300/60'}`}>⏱ {timer}s</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-purple-900/40 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-fuchsia-500 to-amber-400" animate={{ width: `${((qIdx) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
          <div className="bg-purple-900/30 border border-fuchsia-500/20 rounded-xl p-4 text-center">
            <p className="text-white font-medium text-sm">{q.q}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            {q.opts.map((opt, i) => {
              const isCorrect = i === q.ans
              const isSelected = i === selected
              let bg = 'bg-purple-900/30 border-fuchsia-500/20 hover:bg-fuchsia-900/30 hover:border-fuchsia-400/40'
              if (showResult) {
                if (isCorrect) bg = 'bg-green-900/40 border-green-400/60'
                else if (isSelected) bg = 'bg-red-900/40 border-red-400/60'
                else bg = 'bg-purple-900/20 border-purple-700/20 opacity-50'
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                  className={`p-3 rounded-xl border text-xs text-white font-medium transition-all ${bg}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
