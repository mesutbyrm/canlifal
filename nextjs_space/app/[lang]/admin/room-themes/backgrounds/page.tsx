'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import {
  Plus, Search, Save, Trash2, Edit, X, Upload, Image as ImageIcon,
  ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff,
  Volume2, Sparkles, Film, Layers, Palette, Music,
} from 'lucide-react'

interface RoomTheme {
  id: string; name: string; nameEn: string;
  backgroundUrl: string; cloudStoragePath?: string;
  thumbnailUrl?: string; thumbnailCloudPath?: string;
  assetType: string; tier: string; isActive: boolean;
  activeFrom?: string; activeTo?: string; sortOrder: number;
  category?: string; description?: string;
  animationSpeed?: number; blurAmount?: number; opacity?: number;
  hasParallax: boolean; hasZoom: boolean; videoLoop: boolean;
  soundUrl?: string; soundCloudPath?: string; soundVolume?: number;
  isPremium: boolean; isVipOnly: boolean; isEventOnly: boolean;
  contentVersion: number;
  [key: string]: any;
}

const ASSET_TYPES = [
  { value: 'image', label: 'Görsel (PNG/JPG/WebP)' },
  { value: 'svg', label: 'SVG' },
  { value: 'gif', label: 'GIF / APNG' },
  { value: 'video', label: 'Video (MP4)' },
  { value: 'lottie', label: 'Lottie (JSON)' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'animated', label: 'Animasyonlu' },
];

const TIERS = [
  { value: 'free', label: 'Ücretsiz' },
  { value: 'gold', label: 'Gold' },
  { value: 'vip', label: 'VIP' },
  { value: 'premium', label: 'Premium' },
  { value: 'event', label: 'Etkinlik' },
];

const CATEGORIES = [
  { value: '', label: 'Kategorisiz' },
  { value: 'night', label: '🌙 Gece' },
  { value: 'day', label: '☀️ Gündüz' },
  { value: 'season', label: '🍂 Mevsim' },
  { value: 'event', label: '🎉 Etkinlik' },
  { value: 'theme', label: '🎨 Tema' },
  { value: 'custom', label: '⚙️ Özel' },
];

const emptyTheme: Partial<RoomTheme> = {
  name: '', nameEn: '', backgroundUrl: '', assetType: 'image',
  tier: 'free', isActive: true, sortOrder: 0,
  animationSpeed: 1.0, blurAmount: 0, opacity: 1.0,
  hasParallax: false, hasZoom: false, videoLoop: true,
  soundVolume: 50, isPremium: false, isVipOnly: false, isEventOnly: false,
};

async function uploadFile(file: File, purpose: string) {
  const res = await fetch('/api/admin/gift-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', purpose: `bg-${purpose}` }),
  });
  if (!res.ok) throw new Error('URL alınamadı');
  const { uploadUrl, cloud_storage_path } = await res.json();
  const headers: Record<string, string> = { 'Content-Type': file.type || 'application/octet-stream' };
  if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment';
  const up = await fetch(uploadUrl, { method: 'PUT', body: file, headers });
  if (!up.ok) throw new Error('Yüklenemedi');
  const m = uploadUrl.match(/https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com/);
  const publicUrl = m ? `https://${m[1]}.s3.${m[2]}.amazonaws.com/${cloud_storage_path.split('/').map(encodeURIComponent).join('/')}` : '';
  return { cloudPath: cloud_storage_path, publicUrl };
}

function FileField({ label, accept, purpose, value, onChange, onCloud }: {
  label: string; accept: string; purpose: string; value?: string;
  onChange: (v: string) => void; onCloud?: (v: string) => void;
}) {
  const [upl, setUpl] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUpl(true); setMsg('Yükleniyor...');
    try {
      const { cloudPath, publicUrl } = await uploadFile(f, purpose);
      onChange(publicUrl || cloudPath); onCloud?.(cloudPath); setMsg('✅');
    } catch (err: any) { setMsg(`❌ ${err.message}`); } finally { setUpl(false); }
  };
  return (
    <div>
      <label className="text-xs text-white/60 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="URL" />
        <button onClick={() => ref.current?.click()} disabled={upl}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs flex items-center gap-1">
          <Upload size={14} /> Yükle
        </button>
      </div>
      <input ref={ref} type="file" accept={accept} onChange={handle} className="hidden" />
      {msg && <p className="text-xs mt-1 text-white/50">{msg}</p>}
    </div>
  );
}

function Section({ title, icon, children, open: defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
      <button onClick={() => setO(!o)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition">
        {icon}<span className="font-medium text-sm">{title}</span>
        <span className="ml-auto">{o ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      <AnimatePresence>{o && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
          <div className="p-4 space-y-3">{children}</div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

export default function AdminBackgroundsPage() {
  const { language } = useLanguage();
  const lang = language || 'tr';
  const [themes, setThemes] = useState<RoomTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<RoomTheme> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTier) params.set('tier', filterTier);
      if (filterCat) params.set('category', filterCat);
      const res = await fetch(`/api/admin/room-themes/backgrounds?${params}`);
      const data = await res.json();
      setThemes(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  }, [filterTier, filterCat]);

  useEffect(() => { fetchThemes(); }, [fetchThemes]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true); setSaveMsg('');
    try {
      const isNew = !editing.id;
      const res = await fetch('/api/admin/room-themes/backgrounds', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Hata');
      setSaveMsg('✅ Kaydedildi!'); setEditing(null); fetchThemes();
    } catch (err: any) { setSaveMsg(`❌ ${err.message}`); } finally { setSaving(false); }
  };

  const setField = (k: string, v: any) => setEditing(p => p ? { ...p, [k]: v } : null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900/30 to-gray-900 text-white p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${lang}/admin/room-themes`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft size={20} /></a>
        <Palette className="text-indigo-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Arka Plan Yönetimi</h1>
          <p className="text-white/50 text-sm">Sesli oda arka planlarını yönetin — VIP, Premium, mevsimsel, efektli</p>
        </div>
        <button onClick={() => setEditing({ ...emptyTheme })}
          className="ml-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium flex items-center gap-2">
          <Plus size={16} /> Yeni Arka Plan
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">Tüm Seviyeler</option>
          {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">Tüm Kategoriler</option>
          {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={fetchThemes} className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><RefreshCw size={16} /></button>
      </div>

      {/* Grid */}
      {loading ? <div className="text-center py-20 text-white/40">Yükleniyor...</div> : themes.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Palette size={48} className="mx-auto mb-3 opacity-30" />
          <p>Henüz arka plan yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {themes.map(t => (
            <motion.div key={t.id} whileHover={{ scale: 1.02 }}
              className={`rounded-xl overflow-hidden border cursor-pointer group relative ${
                t.isActive ? 'border-white/10 hover:border-indigo-500/50' : 'border-red-500/30 opacity-60'
              }`} onClick={() => setEditing({ ...t })}>
              <div className="aspect-video bg-white/5 relative">
                {t.assetType === 'video' ? (
                  <video src={t.backgroundUrl} className="w-full h-full object-cover" muted loop />
                ) : (
                  <img src={t.thumbnailUrl || t.backgroundUrl} alt={t.name}
                    className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="absolute top-1 right-1 flex gap-1">
                  {t.isPremium && <span className="bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">👑</span>}
                  {t.isVipOnly && <span className="bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">VIP</span>}
                </div>
              </div>
              <div className="p-2">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40 uppercase">{t.tier} • {t.assetType}</span>
                  {t.category && <span className="text-[10px] text-indigo-300">{t.category}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4"
            onClick={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl my-8"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold">{editing.id ? 'Arka Plan Düzenle' : 'Yeni Arka Plan'}</h2>
                <div className="flex gap-2">
                  {saveMsg && <span className="text-sm">{saveMsg}</span>}
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                    <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
              </div>
              <div className="p-4 space-y-2 max-h-[75vh] overflow-y-auto">
                <Section title="Temel Bilgiler" icon={<ImageIcon size={16} className="text-indigo-400" />} open={true}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-white/60">İsim (TR)</label>
                      <input value={editing.name || ''} onChange={e => setField('name', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="text-xs text-white/60">İsim (EN)</label>
                      <input value={editing.nameEn || ''} onChange={e => setField('nameEn', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="text-xs text-white/60">Dosya Türü</label>
                      <select value={editing.assetType || 'image'} onChange={e => setField('assetType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    <div><label className="text-xs text-white/60">Seviye</label>
                      <select value={editing.tier || 'free'} onChange={e => setField('tier', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                    <div><label className="text-xs text-white/60">Kategori</label>
                      <select value={editing.category || ''} onChange={e => setField('category', e.target.value || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                    <div><label className="text-xs text-white/60">Sıralama</label>
                      <input type="number" value={editing.sortOrder ?? 0} onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                    <div className="col-span-2"><label className="text-xs text-white/60">Açıklama</label>
                      <textarea value={editing.description || ''} onChange={e => setField('description', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" rows={2} /></div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editing.isActive ?? true} onChange={e => setField('isActive', e.target.checked)} />
                      <span className="text-sm">Aktif</span></label>
                  </div>
                </Section>

                <Section title="Medya Dosyaları" icon={<Upload size={16} className="text-blue-400" />} open={!editing.id}>
                  <FileField label="🖼️ Arka Plan Dosyası" accept="image/*,video/mp4,.json,.svg"
                    purpose="background" value={editing.backgroundUrl || ''}
                    onChange={v => setField('backgroundUrl', v)} onCloud={v => setField('cloudStoragePath', v)} />
                  <FileField label="🖼️ Küçük Önizleme" accept="image/*"
                    purpose="thumb" value={editing.thumbnailUrl || ''}
                    onChange={v => setField('thumbnailUrl', v)} onCloud={v => setField('thumbnailCloudPath', v)} />
                  <FileField label="🔊 Ortam Sesi" accept="audio/*,.mp3,.wav,.ogg"
                    purpose="sound" value={editing.soundUrl || ''}
                    onChange={v => setField('soundUrl', v)} onCloud={v => setField('soundCloudPath', v)} />
                </Section>

                <Section title="Görsel Ayarlar" icon={<Sparkles size={16} className="text-yellow-400" />}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><label className="text-xs text-white/60">Animasyon Hızı (0.1-3.0)</label>
                      <input type="number" step="0.1" min={0.1} max={3} value={editing.animationSpeed ?? 1.0}
                        onChange={e => setField('animationSpeed', parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="text-xs text-white/60">Bulanıklık (0-20px)</label>
                      <input type="range" min={0} max={20} value={editing.blurAmount ?? 0}
                        onChange={e => setField('blurAmount', parseInt(e.target.value))}
                        className="w-full" />
                      <span className="text-xs text-white/40">{editing.blurAmount ?? 0}px</span></div>
                    <div><label className="text-xs text-white/60">Opasite (0-1)</label>
                      <input type="range" min={0} max={100} value={Math.round((editing.opacity ?? 1) * 100)}
                        onChange={e => setField('opacity', parseInt(e.target.value) / 100)}
                        className="w-full" />
                      <span className="text-xs text-white/40">{Math.round((editing.opacity ?? 1) * 100)}%</span></div>
                    <div><label className="text-xs text-white/60">Ses Seviyesi</label>
                      <input type="range" min={0} max={100} value={editing.soundVolume ?? 50}
                        onChange={e => setField('soundVolume', parseInt(e.target.value))}
                        className="w-full" />
                      <span className="text-xs text-white/40">{editing.soundVolume ?? 50}%</span></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                    {[
                      { key: 'hasParallax', label: 'Parallax Efekti' },
                      { key: 'hasZoom', label: 'Zoom Efekti' },
                      { key: 'videoLoop', label: 'Video Döngü' },
                      { key: 'isPremium', label: 'Premium' },
                      { key: 'isVipOnly', label: 'Sadece VIP' },
                      { key: 'isEventOnly', label: 'Sadece Etkinlik' },
                    ].map(p => (
                      <label key={p.key} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                        <input type="checkbox" checked={editing[p.key] ?? false}
                          onChange={e => setField(p.key, e.target.checked)} className="rounded" />
                        <span className="text-sm">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </Section>

                <Section title="Zamanlı Erişim" icon={<Eye size={16} className="text-green-400" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-white/60">Başlangıç (opsiyonel)</label>
                      <input type="datetime-local" value={editing.activeFrom ? new Date(editing.activeFrom).toISOString().slice(0, 16) : ''}
                        onChange={e => setField('activeFrom', e.target.value || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                    <div><label className="text-xs text-white/60">Bitiş (opsiyonel)</label>
                      <input type="datetime-local" value={editing.activeTo ? new Date(editing.activeTo).toISOString().slice(0, 16) : ''}
                        onChange={e => setField('activeTo', e.target.value || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" /></div>
                  </div>
                </Section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
