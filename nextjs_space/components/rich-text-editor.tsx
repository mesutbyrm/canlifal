'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Undo, Redo, Type, Quote, Minus, Code, Palette, Upload, X, Loader2 } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/tiff,image/avif,image/heic,image/heif,image/apng,image/ico,image/x-icon'

export default function RichTextEditor({ value, onChange, placeholder = 'İçerik yazın...', minHeight = '400px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || ''
      setIsInitialized(true)
      updateWordCount()
    }
  }, [value, isInitialized])

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && isInitialized) {
      const currentHtml = editorRef.current.innerHTML
      if (value !== currentHtml && value !== undefined) {
        // Only update if significantly different (not just whitespace/formatting)
        const cleanCurrent = currentHtml.replace(/<br\s*\/?>/gi, '').trim()
        const cleanValue = (value || '').replace(/<br\s*\/?>/gi, '').trim()
        if (cleanCurrent === '' && cleanValue !== '') {
          editorRef.current.innerHTML = value
          updateWordCount()
        }
      }
    }
  }, [value, isInitialized])

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || ''
      const count = text.split(/\s+/).filter(Boolean).length
      setWordCount(count)
    }
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
      updateWordCount()
    }
  }, [onChange])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Sadece görsel dosyaları kabul edilir')
      return
    }

    setUploading(true)
    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true
        })
      })

      if (!presignedRes.ok) throw new Error('Yükleme bağlantısı alınamadı')
      const { uploadUrl, cloud_storage_path } = await presignedRes.json()

      // Check signed headers to determine required headers
      const urlObj = new URL(uploadUrl)
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') || ''
      const headers: Record<string, string> = { 'Content-Type': file.type }
      if (signedHeaders.includes('content-disposition')) {
        headers['Content-Disposition'] = 'attachment'
      }

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file
      })

      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi')

      // Get the public URL
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, isPublic: true })
      })

      if (!urlRes.ok) throw new Error('URL alınamadı')
      const { url } = await urlRes.json()

      // Insert image into editor
      const imgHtml = `<img src="${url}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`
      editorRef.current?.focus()
      document.execCommand('insertHTML', false, imgHtml)
      handleInput()
    } catch (err: any) {
      console.error('Image upload error:', err)
      alert(err.message || 'Resim yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      Array.from(files).forEach(file => handleImageUpload(file))
    }
    e.target.value = ''
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file) await handleImageUpload(file)
          return
        }
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer?.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          await handleImageUpload(files[i])
        }
      }
    }
  }

  const insertLink = () => {
    if (!linkUrl) return
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    const text = linkText || url
    const html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#a78bfa;text-decoration:underline;">${text}</a>`
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    handleInput()
    setShowLinkModal(false)
    setLinkUrl('')
    setLinkText('')
  }

  const colors = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#a78bfa']

  const ToolButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-purple-500/30 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/5">
        {/* Text formatting */}
        <ToolButton onClick={() => execCommand('bold')} title="Kalın (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('italic')} title="İtalik (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('underline')} title="Altı Çizili (Ctrl+U)">
          <Underline className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('strikeThrough')} title="Üstü Çizili">
          <Type className="w-4 h-4 line-through" />
        </ToolButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Headings */}
        <ToolButton onClick={() => execCommand('formatBlock', '<h2>')} title="Başlık 1">
          <Heading1 className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', '<h3>')} title="Başlık 2">
          <Heading2 className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', '<h4>')} title="Başlık 3">
          <Heading3 className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', '<p>')} title="Normal Metin">
          <Type className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Lists */}
        <ToolButton onClick={() => execCommand('insertUnorderedList')} title="Madde Listesi">
          <List className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('insertOrderedList')} title="Numaralı Liste">
          <ListOrdered className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('formatBlock', '<blockquote>')} title="Alıntı">
          <Quote className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Alignment */}
        <ToolButton onClick={() => execCommand('justifyLeft')} title="Sola Hizala">
          <AlignLeft className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyCenter')} title="Ortala">
          <AlignCenter className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('justifyRight')} title="Sağa Hizala">
          <AlignRight className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Insert */}
        <ToolButton onClick={() => setShowLinkModal(true)} title="Bağlantı Ekle">
          <LinkIcon className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => fileInputRef.current?.click()} title="Resim Yükle">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </ToolButton>
        <ToolButton onClick={() => execCommand('insertHorizontalRule')} title="Yatay Çizgi">
          <Minus className="w-4 h-4" />
        </ToolButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Color */}
        <div className="relative">
          <ToolButton onClick={() => setShowColorPicker(!showColorPicker)} title="Metin Rengi">
            <Palette className="w-4 h-4" />
          </ToolButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50 flex gap-1 flex-wrap w-[130px]">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCommand('foreColor', color); setShowColorPicker(false) }}
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Undo/Redo */}
        <ToolButton onClick={() => execCommand('undo')} title="Geri Al">
          <Undo className="w-4 h-4" />
        </ToolButton>
        <ToolButton onClick={() => execCommand('redo')} title="İleri Al">
          <Redo className="w-4 h-4" />
        </ToolButton>

        {/* Word count */}
        <div className="ml-auto text-xs text-gray-500">
          {wordCount} kelime
        </div>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        data-placeholder={placeholder}
        className="prose prose-invert max-w-none p-4 text-white text-sm focus:outline-none overflow-y-auto"
        style={{ minHeight, maxHeight: '600px' }}
      />

      {/* Image upload hint */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-white/3">
        <Upload className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">
          Resim eklemek için sürükle-bırak, yapıştır veya butondan yükleyin · JPG, PNG, GIF, WebP, SVG, BMP, TIFF, AVIF, HEIC desteklenir
        </span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Bağlantı Ekle</h3>
              <button type="button" onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">URL</label>
                <input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Metin (opsiyonel)</label>
                <input
                  value={linkText}
                  onChange={e => setLinkText(e.target.value)}
                  placeholder="Bağlantı metni"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={insertLink}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Styles */}
      <style jsx global>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
          cursor: pointer;
        }
        [contenteditable] img:hover {
          outline: 2px solid #a78bfa;
          outline-offset: 2px;
        }
        [contenteditable] blockquote {
          border-left: 3px solid #a78bfa;
          padding-left: 16px;
          margin: 12px 0;
          color: #d1d5db;
          font-style: italic;
        }
        [contenteditable] a {
          color: #a78bfa;
          text-decoration: underline;
        }
        [contenteditable] h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 16px 0 8px;
        }
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 14px 0 6px;
        }
        [contenteditable] h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 12px 0 4px;
        }
        [contenteditable] hr {
          border-color: rgba(255,255,255,0.1);
          margin: 16px 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        [contenteditable] li {
          margin: 4px 0;
        }
      `}</style>
    </div>
  )
}
