'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Table, Sparkles, Loader2, CheckCircle, AlertCircle, Info, X, Download, FolderOpen, Check, BookOpen, ImageIcon } from 'lucide-react'
import Link from 'next/link'

type ImportStatus = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

interface BlogCategory {
  id: string
  slug: string
  nameTr: string
  nameEn: string
  sortOrder: number
}

interface ParsedItem {
  title: string
  content: string
  coverImage: string
  selected: boolean
}

interface ImportResult {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

export default function BulkImportBlogPage() {
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
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('genel')
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [selectAll, setSelectAll] = useState(true)

  useEffect(() => {
    fetch('/api/admin/blog/categories')
      .then(r => r.json())
      .then(data => {
        if (data.categories) setCategories(data.categories)
        else if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

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
      setErrorMsg('Hiç blog yazısı bulunamadı. Dosya formatını kontrol edin.')
      setStatus('error')
      return
    }

    setParsedItems(items)
    setSelectAll(true)
    setStatus('preview')
  }

  const parseTxtLocally = (text: string): ParsedItem[] => {
    const sections = text.split(/\n---\n|\n\n\n+/).filter(s => s.trim())
    return sections.map(section => {
      const lines = section.trim().split('\n').filter((l: string) => l.trim())
      if (lines.length === 0) return null
      let title = lines[0].replace(/^#+\s*/, '').replace(/^\*+\s*/, '').trim()
      title = title.replace(/^["']+|["']+$/g, '').trim()
      // Check for coverImage line (starts with KAPAK: or RESIM: or IMAGE:)
      let coverImage = ''
      let contentStartIdx = 1
      if (lines.length > 1) {
        const secondLine = lines[1].trim()
        const imgMatch = secondLine.match(/^(?:KAPAK|RESİM|RESIM|IMAGE):\s*(.+)/i)
        if (imgMatch) {
          coverImage = imgMatch[1].trim()
          contentStartIdx = 2
        }
      }
      const content = lines.slice(contentStartIdx).join('\n').trim()
      if (!title) return null
      return { title, content: content || title, coverImage, selected: true }
    }).filter(Boolean) as ParsedItem[]
  }

  const parseCsvLocally = (text: string): ParsedItem[] => {
    const lines = text.split('\n').filter((l: string) => l.trim())
    if (lines.length < 2) return []
    const headerLine = lines[0].toLowerCase().trim()
    const headerCols = parseCSVLine(headerLine)
    let titleIdx = headerCols.findIndex((h: string) => h.includes('title') || h.includes('baslik') || h.includes('başlık') || h === 'ad')
    let contentIdx = headerCols.findIndex((h: string) => h.includes('content') || h.includes('icerik') || h.includes('içerik') || h.includes('metin'))
    let imageIdx = headerCols.findIndex((h: string) => h.includes('kapak') || h.includes('resim') || h.includes('image') || h.includes('cover') || h.includes('görsel'))
    if (titleIdx === -1) titleIdx = 0
    if (contentIdx === -1) contentIdx = headerCols.length > 1 ? 1 : 0
    const items: ParsedItem[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      const title = (cols[titleIdx] || '').trim()
      const content = (cols[contentIdx] || '').trim()
      const coverImage = imageIdx !== -1 ? (cols[imageIdx] || '').trim() : ''
      if (title) items.push({ title, content: content || title, coverImage, selected: true })
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
      formData.append('textContent', JSON.stringify(selectedItems.map(i => ({ title: i.title, content: i.content, coverImage: i.coverImage }))))

      const res = await fetch('/api/admin/blog/bulk-import', {
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

  const catLabel = categories.find(c => c.slug === selectedCategory)?.nameTr || selectedCategory

  const downloadSampleTxt = () => {
    const sample = `Kahve Falının Tarihçesi
KAPAK: https://i.ytimg.com/vi/S4jYevtJeB4/maxresdefault.jpg
Kahve falı, yüzyıllardır Osmanlı kültürünün önemli bir parçası olmuştur. Türk kahvesi içildikten sonra fincan ters çevrilir ve soğuması beklenir. Fincandaki şekiller yorumlanarak gelecek hakkında öngörülerde bulunulur.

Bu gelenek, sosyal yaşamın ayrılmaz bir parçası olup nesilden nesile aktarılmıştır. Kahve falı sadece geleceği okumak değil, aynı zamanda dostluk ve sohbetin simgesidir.

---

Tarot Kartları Nasıl Okunur?
KAPAK: https://images.unsplash.com/photo-1637757935037-a7837f36807d?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dGFyb3QlMjBjYXJkfGVufDB8fDB8fHww
Tarot okuması, 78 karttan oluşan bir deste ile yapılır. Büyük Arkana ve Küçük Arkana olmak üzere iki gruba ayrılır. Her kart farklı bir anlam taşır ve kartların dizilişi yorumu etkiler.

Tarot falı, kişinin geçmişi, bugünü ve geleceği hakkında derin içgörüler sunar. Kartların enerjisi ve sembolleri, yaşam yolculuğunuzda size rehberlik eder.

---

Burç Uyumu Rehberi
Astrolojide burç uyumu, iki kişi arasındaki ilişkinin potansiyelini gösterir. Ateş burçları (Koç, Aslan, Yay) genellikle hava burçlarıyla (İkizler, Terazi, Kova) uyumludur.

Su burçları (Yengeç, Akrep, Balık) ise toprak burçlarıyla (Boğa, Başak, Oğlak) doğal bir uyum içindedir. Burç uyumu sadece güneş burcuna değil, yükselen burca ve ay burcuna da bağlıdır.`
    const blob = new Blob([sample], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ornek-blog-yazilari-${selectedCategory}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSampleCsv = () => {
    const sample = `başlık;içerik;kapak_resmi
Kahve Falının Tarihçesi;"Kahve falı, yüzyıllardır Osmanlı kültürünün önemli bir parçası olmuştur. Türk kahvesi içildikten sonra fincan ters çevrilir ve soğuması beklenir. Fincandaki şekiller yorumlanarak gelecek hakkında öngörülerde bulunulur.";https://ychef.files.bbci.co.uk/624x351/p0hh9v2c.jpg
Tarot Kartları Nasıl Okunur?;"Tarot okuması, 78 karttan oluşan bir deste ile yapılır. Büyük Arkana ve Küçük Arkana olmak üzere iki gruba ayrılır. Her kart farklı bir anlam taşır ve kartların dizilişi yorumu etkiler.";https://i.pinimg.com/736x/65/a0/0f/65a00f07682a1f896be989076f4a5b1f.jpg
Burç Uyumu Rehberi;"Astrolojide burç uyumu, iki kişi arasındaki ilişkinin potansiyelini gösterir. Ateş burçları (Koç, Aslan, Yay) genellikle hava burçlarıyla uyumludur.";`
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ornek-blog-yazilari-${selectedCategory}.csv`
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
            href={`/${lang}/admin/blog`}
            className="p-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-fuchsia-400" />
              Toplu Blog Yazısı İçe Aktarma
            </h1>
            <p className="text-purple-300/70 text-sm mt-1">TXT veya CSV dosyasından toplu blog yazısı ekleyin</p>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-6 p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
          <label className="flex items-center gap-2 text-purple-200 font-medium mb-3">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            Kategori Seçin
          </label>
          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.slug
                      ? 'bg-fuchsia-600/40 border-2 border-fuchsia-400 text-white shadow-lg shadow-fuchsia-500/20'
                      : 'bg-purple-900/20 border border-purple-500/20 text-purple-400 hover:border-purple-500/40 hover:text-purple-300'
                  }`}
                >
                  <span>{cat.nameTr}</span>
                  {selectedCategory === cat.slug && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="Kategori slug yazın (orn: genel, astroloji, tarot)"
                className="w-full px-4 py-2 rounded-lg bg-black/30 border border-purple-500/30 text-white placeholder-purple-500/40 focus:border-purple-400 focus:outline-none text-sm"
              />
              <p className="text-purple-400/60 text-xs">Mevcut blog kategorileri yükleniyor veya bulunamadı. Manuel olarak girebilirsiniz.</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200/80">
              <p className="font-semibold text-blue-200 mb-2">Desteklenen Formatlar ve Alanlar:</p>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-blue-300">📝 TXT Formatı:</span> Her blog yazısı &quot;---&quot; ile veya üç boş satırla ayrılır. İlk satır <strong>başlık</strong>, ikinci satır opsiyonel <strong>KAPAK: resim_url</strong>, sonraki satırlar <strong>içerik</strong>.
                </div>
                <div>
                  <span className="font-medium text-blue-300">📊 CSV Formatı:</span> İlk satır başlık satırıdır. Sütunlar: <strong>başlık</strong>, <strong>içerik</strong>, <strong>kapak_resmi</strong> (opsiyonel). Ayraç: noktalı virgül (;) veya virgül (,) veya tab.
                </div>
                <div>
                  <span className="font-medium text-green-300">🖼️ Kapak Resmi:</span> Her yazıya opsiyonel olarak kapak resmi URL&apos;si ekleyebilirsiniz. Boş bırakılabilir.
                </div>
                <div>
                  <span className="font-medium text-amber-300">🤖 AI SEO:</span> Anahtar kelimeler, meta açıklaması ve kısa açıklama AI tarafından otomatik oluşturulur.
                </div>
                <div>
                  <span className="font-medium text-green-300">✅ Önizleme:</span> İçerikleri görebilir, teker teker veya toplu seçerek aktarabilirsiniz.
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
                    ? 'ba\u015fl\u0131k;i\u00e7erik;kapak_resmi\nKahve Fal\u0131 Rehberi;"Kahve fal\u0131 hakk\u0131nda detayl\u0131 bir yaz\u0131...";https://example.com/kahve.jpg\nTarot Kartlar\u0131;"Tarot kartlar\u0131 hakk\u0131nda...";https://example.com/tarot.jpg'
                    : 'Kahve Fal\u0131n\u0131n Tarih\u00e7esi\nKAPAK: https://example.com/kahve.jpg\nKahve fal\u0131 y\u00fczy\u0131llard\u0131r...\n\n---\n\nTarot Kartlar\u0131\nKAPAK: https://example.com/tarot.jpg\nTarot okumas\u0131 78 karttan...'
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
                    Anahtar kelimeler, meta açıklaması ve kısa açıklama AI tarafından otomatik oluşturulur
                  </p>
                </div>
              </label>
            </div>

            {/* Parse & Preview Button */}
            <button
              onClick={parseContent}
              disabled={(importMode === 'file' ? !selectedFile : !pasteContent.trim()) || status === 'parsing'}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold text-lg hover:from-fuchsia-500 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      ? 'bg-fuchsia-600/20 border-fuchsia-400/50'
                      : 'bg-purple-900/10 border-purple-500/10 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      item.selected ? 'bg-fuchsia-600 border-fuchsia-400' : 'border-purple-500/40'
                    }`}>
                      {item.selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.title}</p>
                      <p className="text-purple-300/60 text-sm mt-0.5 line-clamp-2">{item.content}</p>
                      {item.coverImage && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <ImageIcon className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400/70 text-xs truncate">{item.coverImage}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Category reminder */}
            <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/20 flex items-center gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-amber-200">
                Seçilen {selectedCount} öğe <strong>&quot;{catLabel}&quot;</strong> kategorisine aktarılacak
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
                href={`/${lang}/admin/blog`}
                className="flex-1 py-3 rounded-xl bg-fuchsia-600/30 border border-fuchsia-400/60 text-fuchsia-200 font-medium hover:bg-fuchsia-600/50 transition-colors text-center"
              >
                Blog Yazılarına Git
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}