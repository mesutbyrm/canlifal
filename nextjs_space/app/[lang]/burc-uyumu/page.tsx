'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Heart, Sparkles, Loader2, Star, Moon, Sun, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ZODIAC_SIGNS = [
  { id: 'koc', name: 'Ko\u00e7', symbol: '\u2648', element: 'Ate\u015f' },
  { id: 'boga', name: 'Bo\u011fa', symbol: '\u2649', element: 'Toprak' },
  { id: 'ikizler', name: '\u0130kizler', symbol: '\u264a', element: 'Hava' },
  { id: 'yengec', name: 'Yenge\u00e7', symbol: '\u264b', element: 'Su' },
  { id: 'aslan', name: 'Aslan', symbol: '\u264c', element: 'Ate\u015f' },
  { id: 'basak', name: 'Ba\u015fak', symbol: '\u264d', element: 'Toprak' },
  { id: 'terazi', name: 'Terazi', symbol: '\u264e', element: 'Hava' },
  { id: 'akrep', name: 'Akrep', symbol: '\u264f', element: 'Su' },
  { id: 'yay', name: 'Yay', symbol: '\u2650', element: 'Ate\u015f' },
  { id: 'oglak', name: 'O\u011flak', symbol: '\u2651', element: 'Toprak' },
  { id: 'kova', name: 'Kova', symbol: '\u2652', element: 'Hava' },
  { id: 'balik', name: 'Bal\u0131k', symbol: '\u2653', element: 'Su' },
]

interface CompatibilityResult {
  overallScore: number
  loveScore: number
  friendshipScore: number
  workScore: number
  analysis: string
  strengths: string[]
  challenges: string[]
  advice: string
}

export default function ZodiacCompatibilityPage() {
  const { data: session } = useSession() || {}
  const [person1, setPerson1] = useState({ sun: '', rising: '', moon: '' })
  const [person2, setPerson2] = useState({ sun: '', rising: '', moon: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompatibilityResult | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!person1.sun || !person2.sun) {
      setError('L\u00fctfen en az\u0131ndan her iki ki\u015fi i\u00e7in g\u00fcne\u015f burcunu se\u00e7in.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person1, person2 })
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Bir hata olu\u015ftu')
      }
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const SignSelector = ({ label, icon, value, onChange }: { label: string, icon: React.ReactNode, value: string, onChange: (v: string) => void }) => (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-2">
        {icon}
        {label}
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {ZODIAC_SIGNS.map(sign => (
          <button
            key={sign.id}
            onClick={() => onChange(sign.id === value ? '' : sign.id)}
            className={`p-2 rounded-lg text-center transition-all text-xs ${
              value === sign.id
                ? 'bg-fuchsia-600/50 border-fuchsia-400 border text-white shadow-lg shadow-fuchsia-500/20'
                : 'bg-purple-900/30 border border-purple-700/30 text-purple-300 hover:bg-purple-800/40'
            }`}
          >
            <span className="text-lg block">{sign.symbol}</span>
            <span className="block mt-0.5">{sign.name}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const ScoreBar = ({ label, score, color }: { label: string, score: number, color: string }) => (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-purple-300">{label}</span>
        <span className="text-white font-bold">%{score}</span>
      </div>
      <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-fuchsia-600/20 px-4 py-1.5 rounded-full mb-4">
            <Heart className="w-4 h-4 text-fuchsia-400" />
            <span className="text-fuchsia-300 text-sm font-medium">Bur\u00e7 Uyumu</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Bur\u00e7 Uyumu Analizi
          </h1>
          <p className="text-purple-300 text-sm">
            G\u00fcne\u015f, y\u00fckselen ve ay bur\u00e7lar\u0131n\u0131zla detayl\u0131 uyum analizi yap\u0131n
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {[{ title: '1. Ki\u015fi', data: person1, setter: setPerson1 }, { title: '2. Ki\u015fi', data: person2, setter: setPerson2 }].map((p, idx) => (
            <div key={idx} className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-lg text-center">{p.title}</h3>
              <SignSelector
                label="G\u00fcne\u015f Burcu *"
                icon={<Sun className="w-4 h-4 text-yellow-400" />}
                value={p.data.sun}
                onChange={v => p.setter({ ...p.data, sun: v })}
              />
              <SignSelector
                label="Y\u00fckselen Bur\u00e7 (Opsiyonel)"
                icon={<Star className="w-4 h-4 text-orange-400" />}
                value={p.data.rising}
                onChange={v => p.setter({ ...p.data, rising: v })}
              />
              <SignSelector
                label="Ay Burcu (Opsiyonel)"
                icon={<Moon className="w-4 h-4 text-blue-400" />}
                value={p.data.moon}
                onChange={v => p.setter({ ...p.data, moon: v })}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !person1.sun || !person2.sun}
          className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analiz Yap\u0131l\u0131yor...</>
          ) : (
            <><Heart className="w-5 h-5" /> Uyumu Analiz Et</>
          )}
        </button>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-6"
            >
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-fuchsia-900/40 to-purple-900/40 border border-fuchsia-500/30 rounded-2xl p-6 text-center">
                <div className="text-6xl font-bold text-fuchsia-300 mb-2">%{result.overallScore}</div>
                <p className="text-purple-300">Genel Uyum Puan\u0131</p>
              </div>

              {/* Score Bars */}
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-5 space-y-4">
                <ScoreBar label="A\u015fk Uyumu" score={result.loveScore} color="bg-gradient-to-r from-pink-500 to-rose-500" />
                <ScoreBar label="Arkada\u015fl\u0131k Uyumu" score={result.friendshipScore} color="bg-gradient-to-r from-blue-500 to-cyan-500" />
                <ScoreBar label="\u0130\u015f Uyumu" score={result.workScore} color="bg-gradient-to-r from-green-500 to-emerald-500" />
              </div>

              {/* Analysis */}
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-400" /> Detayl\u0131 Analiz
                </h3>
                <p className="text-purple-200 text-sm leading-relaxed whitespace-pre-line">{result.analysis}</p>
              </div>

              {/* Strengths & Challenges */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-5">
                  <h4 className="text-green-300 font-semibold mb-3">\u2728 G\u00fc\u00e7l\u00fc Yanlar</h4>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-green-200 text-sm flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">\u2713</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-900/20 border border-orange-700/30 rounded-2xl p-5">
                  <h4 className="text-orange-300 font-semibold mb-3">\u26a0\ufe0f Zorluklar</h4>
                  <ul className="space-y-2">
                    {result.challenges.map((c, i) => (
                      <li key={i} className="text-orange-200 text-sm flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">\u2022</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Advice */}
              <div className="bg-fuchsia-900/20 border border-fuchsia-700/30 rounded-2xl p-5">
                <h4 className="text-fuchsia-300 font-semibold mb-3">\ud83d\udca1 Tavsiye</h4>
                <p className="text-fuchsia-200 text-sm leading-relaxed">{result.advice}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
