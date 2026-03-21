'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Table, Sparkles, Loader2, CheckCircle, AlertCircle, Info, X, Download, FolderOpen, Check } from 'lucide-react'
import Link from 'next/link'
import { DREAM_CATEGORIES } from '@/lib/dream-categories'

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

interface ParsedItem {
  title: string
  content: string
  selected: boolean
}

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
  const [selectedCategory, setSelectedCategory] = useState('genel')
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [selectAll, setSelectAll] = useState(true)

  // Filter out 'tumu' from categories
  const importableCategories = DREAM_CATEGORIES.filter(c => c.value !== 'tumu')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext === 'csv') setFileType('csv')
      else setFileType('txt')
    }
  }

  const parseContent = async () => {
    setStatus('parsing')
    setErrorMsg('')
    let rawContent = ''

    if (importMode === 'file' && selectedFile) {
      rawContent = await selectedFile.text()
    } else if (importMode === 'paste' && pasteContent.trim()) {
      rawContent = pasteContent
    } else {
      setErrorMsg('Lütfen dosya seçin veya metin yapıştırın')
      setStatus('error')
      return
    }

    let items: ParsedItem[] = []
    if (fileType === 'csv') {
      items = parseCsvLocally(rawContent)
    } else {
      items = parseTxtLocally(rawContent)
    }

    if (items.length === 0) {
      setErrorMsg('Hiç rüya tabiri bulunamadı. Dosya formatını kontrol edin.')
      setStatus('error')
      return
    }

    setParsedItems(items)
    setSelectAll(true)
    setStatus('preview')
  }

  const parseTxtLocally = (text: string): ParsedItem[] => {
    // WordPress-style tagged format: [RUYA]...[/RUYA]
    const taggedPattern = /\[RUYA\]([\s\S]*?)\[\/RUYA\]/gi
    const taggedMatches = [...text.matchAll(taggedPattern)]
    
    if (taggedMatches.length > 0) {
      return taggedMatches.map(match => {
        const block = match[1].trim()
        const titleMatch = block.match(/^BASLIK:\s*(.+)/im)
        const contentMatch = block.match(/^ICERIK:\s*([\s\S]*?)$/im)
        
        const title = titleMatch ? titleMatch[1].trim() : ''
        let content = ''
        if (contentMatch) {
          content = contentMatch[1].trim()
        }
        if (!title) return null
        return { title, content: content || title, selected: true }
      }).filter(Boolean) as ParsedItem[]
    }
    
    // Fallback: legacy format with --- separator
    const sections = text.split(/\n---\n|\n\n\n+/).filter(s => s.trim())
    return sections.map(section => {
      const lines = section.trim().split('\n').filter((l: string) => l.trim())
      if (lines.length === 0) return null
      let title = lines[0].replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim()
      title = title.replace(/^["']+|["']+$/g, '').trim()
      const content = lines.slice(1).join('\n').trim()
      if (!title) return null
      return { title, content: content || title, selected: true }
    }).filter(Boolean) as ParsedItem[]
  }

  const parseCsvLocally = (text: string): ParsedItem[] => {
    const lines = text.split('\n').filter((l: string) => l.trim() && !l.trim().startsWith('#'))
    if (lines.length < 2) return []
    const headerLine = lines[0].toLowerCase().trim()
    const headerCols = parseCSVLine(headerLine)
    let titleIdx = headerCols.findIndex((h: string) => h.includes('title') || h.includes('baslik') || h.includes('başlık') || h === 'ad' || h === 'isim')
    let contentIdx = headerCols.findIndex((h: string) => h.includes('content') || h.includes('icerik') || h.includes('içerik') || h.includes('anlam') || h.includes('tabir'))
    if (titleIdx === -1) titleIdx = 0
    if (contentIdx === -1) contentIdx = headerCols.length > 1 ? 1 : 0
    const items: ParsedItem[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      const title = (cols[titleIdx] || '').trim()
      const content = (cols[contentIdx] || '').trim()
      if (title) items.push({ title, content: content || title, selected: true })
    }
    return items
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ } else { inQuotes = !inQuotes }
      } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
        result.push(current.trim()); current = ''
      } else { current += ch }
    }
    result.push(current.trim())
    return result
  }

  const toggleItem = (idx: number) => {
    setParsedItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item))
  }

  const toggleSelectAll = () => {
    const newVal = !selectAll
    setSelectAll(newVal)
    setParsedItems(prev => prev.map(item => ({ ...item, selected: newVal })))
  }

  const handleImport = async () => {
    const selectedItems = parsedItems.filter(i => i.selected)
    if (selectedItems.length === 0) {
      setErrorMsg('Lütfen en az bir öğe seçin')
      return
    }

    setStatus('importing')
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('useAI', String(useAI))
      formData.append('fileType', 'json')
      formData.append('category', selectedCategory)
      formData.append('textContent', JSON.stringify(selectedItems.map(i => ({ title: i.title, content: i.content }))))

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
    setParsedItems([])
    setSelectAll(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadSampleTxt = () => {
    const catLabel = importableCategories.find(c => c.value === selectedCategory)?.label || 'Genel'
    const sample = [
      '# ============================================',
      '# CANLIFAL RUYA TABİRİ İÇE AKTARMA ŞABLONU',
      '# ============================================',
      '# FORMAT: Her rüya tabiri [RUYA] ve [/RUYA] etiketleri arasında olmalıdır.',
      '# ALANLAR:',
      '#   BASLIK: Rüya sembolünün adı (zorunlu) - Otomatik olarak "Rüyada ... Görmek" formatına dönüştürülür',
      '#   ICERIK: Rüya tabirinin tam içeriği (zorunlu)',
      '# NOT: AI SEO aktifse anahtar kelimeler, özet ve meta açıklaması otomatik oluşturulur.',
      '# ============================================',
      '',
      '[RUYA]',
      'BASLIK: Yılan',
      'ICERIK:',
      'Rüyada yılan görmek, düşmanlık ve kötü niyetli insanlara işaret eder. Büyük yılan görmek güçlü bir düşmanı, küçük yılan görmek ise zayıf bir düşmanı simgeler. Yılanı öldürmek düşmandan kurtulmaya delalet eder.',
      '',
      'Siyah yılan görmek sinsi bir düşmanın varlığına, beyaz yılan görmek ise şifa ve olumlu gelişmelere işaret eder. Yılanın sokması beklenmedik bir zarara veya hastalığa dikkat çeker.',
      '[/RUYA]',
      '',
      '[RUYA]',
      'BASLIK: Kedi',
      'ICERIK:',
      'Rüyada kedi görmek, hırsızlık ve hainliğe işaret edebilir. Beyaz kedi görmek iyi haberlere, siyah kedi görmek ise dikkatli olunması gereken durumlara yorumlanır. Kedi sesi duymak dedikodu anlamına gelir.',
      '',
      'Evcil kedi görmek güvenilir bir dost anlamına gelirken, yabani kedi görmek çevrenizdeki kötü niyetli birini simgeler.',
      '[/RUYA]',
      '',
      '[RUYA]',
      'BASLIK: Su',
      'ICERIK:',
      'Rüyada su görmek, ilim, bereket ve hayata işaret eder. Temiz su görmek hayırlı rızka, bulanık su görmek ise sıkıntıya delalet eder. Akan su görmek bereketli bir dönemin habercisidir.',
      '',
      'Denizde yüzmek yeni fırsatlara, nehirde yüzmek ise hayatın akışına uyum sağlamaya işaret eder.',
      '[/RUYA]',
      '',
      '[RUYA]',
      'BASLIK: At',
      'ICERIK:',
      'Rüyada at görmek, güç, şeref ve yükselmeye işaret eder. Beyaz at görmek hayırlı haberlere, siyah at görmek ise güçlü bir irade ve kararlılığa delalet eder. At üstünde olmak makam ve mevki sahibi olmaya yorumlanır.',
      '[/RUYA]',
    ].join('\n')
    const blob = new Blob([sample], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canlifal-ruya-sablonu-${selectedCategory}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSampleCsv = () => {
    const lines = [
      '# CANLIFAL RUYA TABİRİ CSV ŞABLONU',
      '# Ayraç: noktalı virgül (;)',
      '# İçerik tırnak içinde yazılmalıdır: "içerik metni"',
      '# Başlıklar otomatik olarak "Rüyada ... Görmek" formatına dönüştürülür.',
      '# AI SEO aktifse anahtar kelimeler, özet ve meta açıklaması otomatik oluşturulur.',
      '#',
      'BASLIK;ICERIK',
      'Yılan;"Rüyada yılan görmek, düşmanlık ve kötü niyetli insanlara işaret eder. Büyük yılan görmek güçlü bir düşmanı, küçük yılan görmek ise zayıf bir düşmanı simgeler. Yılanı öldürmek düşmandan kurtulmaya delalet eder. Siyah yılan görmek sinsi bir düşmanın varlığına, beyaz yılan görmek ise şifa ve olumlu gelişmelere işaret eder."',
      'Kedi;"Rüyada kedi görmek, hırsızlık ve hainliğe işaret edebilir. Beyaz kedi görmek iyi haberlere, siyah kedi görmek ise dikkatli olunması gereken durumlara yorumlanır. Kedi sesi duymak dedikodu anlamına gelir. Evcil kedi görmek güvenilir bir dost anlamına gelirken, yabani kedi görmek çevrenizdeki kötü niyetli birini simgeler."',
      'Su;"Rüyada su görmek, ilim, bereket ve hayata işaret eder. Temiz su görmek hayırlı rızka, bulanık su görmek ise sıkıntıya delalet eder. Akan su görmek bereketli bir dönemin habercisidir. Denizde yüzmek yeni fırsatlara işaret eder."',
      'At;"Rüyada at görmek, güç, şeref ve yükselmeye işaret eder. Beyaz at görmek hayırlı haberlere, siyah at görmek ise güçlü bir irade ve kararlılığa delalet eder. At üstünde olmak makam ve mevki sahibi olmaya yorumlanır."',
    ]
    const sample = lines.join('\n')
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canlifal-ruya-sablonu-${selectedCategory}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCount = parsedItems.filter(i => i.selected).length

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

        {/* Category Selection */}
        <div className="mb-6 p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
          <label className="flex items-center gap-2 text-purple-200 font-medium mb-3">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            Kategori Seçin
          </label>
          <div className="flex flex-wrap gap-2">
            {importableCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-purple-600/40 border-2 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-purple-900/20 border border-purple-500/20 text-purple-400 hover:border-purple-500/40 hover:text-purple-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {selectedCategory === cat.value && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200/80">
              <p className="font-semibold text-blue-200 mb-2">WordPress Tarzı İçe Aktarma Formatı:</p>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-blue-300">📝 TXT Formatı (Önerilen):</span> Her rüya tabiri <code className="bg-black/30 px-1 rounded text-xs">[RUYA]</code> ve <code className="bg-black/30 px-1 rounded text-xs">[/RUYA]</code> etiketleri arasında yazılır. Alanlar: <strong>BASLIK:</strong> (rüya sembolü adı, zorunlu), <strong>ICERIK:</strong> (tabir metni, zorunlu)
                </div>
                <div>
                  <span className="font-medium text-blue-300">📊 CSV Formatı:</span> Sütunlar: <strong>BASLIK</strong>, <strong>ICERIK</strong>. Ayraç: noktalı virgül (;). İçerik çift tırnak içinde yazılmalı.
                </div>
                <div>
                  <span className="font-medium text-purple-300">💡 Otomatik Dönüşüm:</span> Başlıklar otomatik olarak &quot;Rüyada ... Görmek&quot; formatına dönüştürülür. Sadece sembol adını yazmanız yeterli (örn: &quot;Yılan&quot;).
                </div>
                <div>
                  <span className="font-medium text-amber-300">🤖 AI SEO:</span> Anahtar kelimeler, meta açıklaması ve özet AI tarafından Google botlarına uygun şekilde otomatik oluşturulur.
                </div>
                <div>
                  <span className="font-medium text-green-300">💡 İpucu:</span> Örnek dosyaları indirip başka bir yapay zekaya verin, aynı formatta içerik üretmesini isteyin.
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

        {status !== 'preview' && status !== 'importing' && status !== 'done' && (
          <>
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
                    ? 'BASLIK;ICERIK\nY\u0131lan;"R\u00fcyada y\u0131lan g\u00f6rmek, d\u00fc\u015fmanl\u0131k ve k\u00f6t\u00fc niyetli insanlara i\u015faret eder."\nKedi;"R\u00fcyada kedi g\u00f6rmek, h\u0131rs\u0131zl\u0131k ve hainli\u011fe i\u015faret edebilir."\nAt;"R\u00fcyada at g\u00f6rmek, g\u00fc\u00e7 ve y\u00fckselmeye i\u015faret eder."'
                    : '[RUYA]\nBASLIK: Y\u0131lan\nICERIK:\nR\u00fcyada y\u0131lan g\u00f6rmek, d\u00fc\u015fmanl\u0131k ve k\u00f6t\u00fc niyetli insanlara i\u015faret eder.\n[/RUYA]\n\n[RUYA]\nBASLIK: Kedi\nICERIK:\nR\u00fcyada kedi g\u00f6rmek, h\u0131rs\u0131zl\u0131k ve hainli\u011fe i\u015faret edebilir.\n[/RUYA]\n\n[RUYA]\nBASLIK: At\nICERIK:\nR\u00fcyada at g\u00f6rmek, g\u00fc\u00e7 ve y\u00fckselmeye i\u015faret eder.\n[/RUYA]'
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

            {/* Parse & Preview Button */}
            <button
              onClick={parseContent}
              disabled={(importMode === 'file' ? !selectedFile : !pasteContent.trim()) || status === 'parsing'}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-lg hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'parsing' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {status === 'parsing' ? 'Ayrıştırılıyor...' : 'Önizle ve Seç'}
            </button>
          </>
        )}

        {/* Preview & Selection */}
        {status === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white">{parsedItems.length} öğe bulundu</h3>
                <span className="text-sm text-purple-400">({selectedCount} seçili)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectAll ? 'bg-purple-600/30 text-purple-200 border border-purple-400/60' : 'bg-purple-900/20 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {selectAll ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-900/20 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {parsedItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleItem(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    item.selected
                      ? 'bg-purple-600/20 border-purple-400/50'
                      : 'bg-purple-900/10 border-purple-500/10 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      item.selected ? 'bg-purple-600 border-purple-400' : 'border-purple-500/40'
                    }`}>
                      {item.selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.title}</p>
                      <p className="text-purple-300/60 text-sm mt-0.5 line-clamp-2">{item.content}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Category reminder */}
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/20 flex items-center gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-200">
                Seçilen {selectedCount} öğe <strong>&quot;{importableCategories.find(c => c.value === selectedCategory)?.icon} {importableCategories.find(c => c.value === selectedCategory)?.label}&quot;</strong> kategorisine aktarılacak
              </span>
            </div>

            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {selectedCount} Öğeyi İçe Aktar
            </button>
          </div>
        )}

        {/* Importing */}
        {status === 'importing' && (
          <div className="w-full py-4 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center gap-3 text-purple-200">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">
              {useAI ? 'AI SEO optimizasyonu yapılıyor ve içe aktarılıyor...' : 'İçe aktarılıyor...'}
            </span>
          </div>
        )}

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