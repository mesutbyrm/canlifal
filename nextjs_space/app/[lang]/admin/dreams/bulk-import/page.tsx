'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Table, Sparkles, Loader2, CheckCircle, AlertCircle, Info, X, Download } from 'lucide-react'
import Link from 'next/link'

type ImportStatus = 'idle' | 'parsing' | 'importing' | 'done' | 'error'

interface ImportResult {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

export default function BulkImportDreamsPage() {
  const params = useParams()
  const lang = (params?.lang as string) || 'tr'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importMode, setImportMode] = useState<'file' | 'paste'>('file')
  const [fileType, setFileType] = useState<'txt' | 'csv'>('txt')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pasteContent, setPasteContent] = useState('')
  const [useAI, setUseAI] = useState(true)
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'csv') setFileType('csv')
      else setFileType('txt')
    }
  }

  const handleImport = async () => {
    setStatus('importing')
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('useAI', String(useAI))
      formData.append('fileType', fileType)

      if (importMode === 'file' && selectedFile) {
        formData.append('file', selectedFile)
      } else if (importMode === 'paste' && pasteContent.trim()) {
        formData.append('textContent', pasteContent)
      } else {
        setErrorMsg('Lütfen dosya seçin veya metin yapıştırın')
        setStatus('error')
        return
      }

      const res = await fetch('/api/admin/dreams/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'İçe aktarma başarısız')
        setStatus('error')
        return
      }

      setResult(data)
      setStatus('done')
    } catch {
      setErrorMsg('Sunucu hatası oluştu')
      setStatus('error')
    }
  }

  const resetForm = () => {
    setStatus('idle')
    setResult(null)
    setErrorMsg('')
    setSelectedFile(null)
    setPasteContent('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadSampleTxt = () => {
    const sample = `Yılan
Rüyada yılan görmek, düşmanlık ve kötü niyetli insanlara işaret eder. Büyük yılan görmek güçlü bir düşmanı, küçük yılan görmek ise zayıf bir düşmanı simgeler. Yılanı öldürmek düşmandan kurtulmaya delalet eder.

---

Kedi
Rüyada kedi görmek, hırsızlık ve hainliğe işaret edebilir. Beyaz kedi görmek iyi haberlere, siyah kedi görmek ise dikkatli olunması gereken durumlara yorumlanır. Kedi sesi duymak dedikodu anlamına gelir.

---

Su
Rüyada su görmek, ilim, bereket ve hayata işaret eder. Temiz su görmek hayırlı rızka, bulanık su görmek ise sıkıntıya delalet eder. Akan su görmek bereketli bir dönemin habercisidir.`
    const blob = new Blob([sample], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ornek-ruya-tabirleri.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSampleCsv = () => {
    const sample = `başlık;içerik
Yılan;"Rüyada yılan görmek, düşmanlık ve kötü niyetli insanlara işaret eder. Büyük yılan görmek güçlü bir düşmanı simgeler."
Kedi;"Rüyada kedi görmek, hırsızlık ve hainliğe işaret edebilir. Beyaz kedi görmek iyi haberlere yorumlanır."
Su;"Rüyada su görmek, ilim, bereket ve hayata işaret eder. Temiz su görmek hayırlı rızka delalet eder."`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ornek-ruya-tabirleri.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #0a0118 0%, #1a0a2e 50%, #0a0118 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href={`/${lang}/admin/dreams`}
            className="p-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Toplu Rüya Tabiri İçe Aktarma</h1>
            <p className="text-purple-300/70 text-sm mt-1">TXT veya CSV dosyasından toplu rüya tabiri ekleyin</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200/80">
              <p className="font-semibold text-blue-200 mb-2">Desteklenen Formatlar:</p>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-blue-300">TXT Formatı:</span> Her rüya tabiri &quot;---&quot; ile veya üç boş satırla ayrılmalıdır. İlk satır başlık, sonraki satırlar içeriktir.
                </div>
                <div>
                  <span className="font-medium text-blue-300">CSV Formatı:</span> İlk satır başlık satırı olmalıdır. Sütunlar: başlık/title, içerik/content. Ayraç olarak virgül, noktalı virgül veya tab kullanılabilir.
                </div>
                <div>
                  <span className="font-medium text-amber-300">🤖 AI SEO:</span> Aktif edildiğinde, anahtar kelimeler, meta açıklaması ve özet AI tarafından Google botlarına uygun şekilde otomatik oluşturulur.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Downloads */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={downloadSampleTxt}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Örnek TXT İndir
          </button>
          <button
            onClick={downloadSampleCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Örnek CSV İndir
          </button>
        </div>

        {/* Import Mode Toggle */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setImportMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
              importMode === 'file'
                ? 'bg-purple-600/30 border-purple-400/60 text-purple-200'
                : 'bg-purple-900/20 border-purple-500/20 text-purple-400 hover:border-purple-500/40'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Dosya Yükle</span>
          </button>
          <button
            onClick={() => setImportMode('paste')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all ${
              importMode === 'paste'
                ? 'bg-purple-600/30 border-purple-400/60 text-purple-200'
                : 'bg-purple-900/20 border-purple-500/20 text-purple-400 hover:border-purple-500/40'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Metin Yapıştır</span>
          </button>
        </div>

        {/* File Upload Section */}
        {importMode === 'file' && (
          <div className="mb-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-500/40 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-400/60 hover:bg-purple-900/10 transition-all"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  {fileType === 'csv' ? (
                    <Table className="w-10 h-10 text-green-400" />
                  ) : (
                    <FileText className="w-10 h-10 text-blue-400" />
                  )}
                  <div className="text-left">
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-purple-300/60 text-sm">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {fileType.toUpperCase()} dosyası
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="ml-4 p-1 rounded-lg hover:bg-red-900/30 text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-purple-400/60 mx-auto mb-3" />
                  <p className="text-purple-200 font-medium">Dosya seçmek için tıklayın</p>
                  <p className="text-purple-400/60 text-sm mt-1">.txt veya .csv dosyası (UTF-8)</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,.tsv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Paste Section */}
        {importMode === 'paste' && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-purple-200 font-medium">Dosya Tipi:</label>
              <button
                onClick={() => setFileType('txt')}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  fileType === 'txt'
                    ? 'bg-blue-600/30 border border-blue-400/60 text-blue-200'
                    : 'bg-purple-900/20 border border-purple-500/20 text-purple-400'
                }`}
              >
                TXT
              </button>
              <button
                onClick={() => setFileType('csv')}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  fileType === 'csv'
                    ? 'bg-green-600/30 border border-green-400/60 text-green-200'
                    : 'bg-purple-900/20 border border-purple-500/20 text-purple-400'
                }`}
              >
                CSV
              </button>
            </div>
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={fileType === 'csv'
                ? 'başlık;içerik\nYılan;Rüyada yılan görmek...\nKedi;Rüyada kedi görmek...'
                : 'Yılan\nRüyada yılan görmek, düşmanlık ve kötü niyetli insanlara işaret eder.\n\n---\n\nKedi\nRüyada kedi görmek, hırsızlık ve hainliğe işaret edebilir.'
              }
              className="w-full h-64 p-4 rounded-xl bg-black/30 border border-purple-500/30 text-white placeholder-purple-500/40 focus:border-purple-400 focus:outline-none resize-y font-mono text-sm"
            />
          </div>
        )}

        {/* AI SEO Toggle */}
        <div className="mb-6 p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${
                useAI ? 'bg-purple-600' : 'bg-gray-600'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${
                  useAI ? 'translate-x-6.5 ml-1' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-white font-medium">AI SEO Optimizasyonu</span>
              </div>
              <p className="text-purple-300/60 text-sm mt-0.5">
                Anahtar kelimeler, meta açıklaması ve özet Google botlarına uygun şekilde AI tarafından otomatik oluşturulur
              </p>
            </div>
          </label>
        </div>

        {/* Import Button */}
        {status === 'idle' || status === 'error' ? (
          <button
            onClick={handleImport}
            disabled={importMode === 'file' ? !selectedFile : !pasteContent.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-lg hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            İçe Aktar
          </button>
        ) : status === 'importing' ? (
          <div className="w-full py-4 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center gap-3 text-purple-200">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">
              {useAI ? 'AI SEO optimizasyonu yapılıyor ve içe aktarılıyor...' : 'İçe aktarılıyor...'}
            </span>
          </div>
        ) : null}

        {/* Error Message */}
        {status === 'error' && errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-900/20 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* Success Result */}
        {status === 'done' && result && (
          <div className="mt-6 space-y-4">
            <div className="p-6 rounded-xl bg-green-900/20 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <h3 className="text-green-200 font-bold text-lg">İçe Aktarma Tamamlandı!</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-900/30">
                  <p className="text-3xl font-bold text-green-300">{result.imported}</p>
                  <p className="text-green-400/70 text-sm">Başarılı</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-900/30">
                  <p className="text-3xl font-bold text-yellow-300">{result.skipped}</p>
                  <p className="text-yellow-400/70 text-sm">Atlanan</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-900/30">
                  <p className="text-3xl font-bold text-purple-300">{result.total}</p>
                  <p className="text-purple-400/70 text-sm">Toplam</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
                <h4 className="text-yellow-200 font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Uyarılar ({result.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-yellow-300/70 text-sm">• {err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-xl bg-purple-900/30 border border-purple-500/30 text-purple-200 font-medium hover:bg-purple-900/50 transition-colors"
              >
                Yeni İçe Aktarma
              </button>
              <Link
                href={`/${lang}/admin/dreams`}
                className="flex-1 py-3 rounded-xl bg-purple-600/30 border border-purple-400/60 text-purple-200 font-medium hover:bg-purple-600/50 transition-colors text-center"
              >
                Rüya Tabirlerine Git
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
