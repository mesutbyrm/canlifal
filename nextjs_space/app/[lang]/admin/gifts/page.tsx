'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import {
  Gift, Plus, Search, Filter, Save, Trash2, Edit, X, Upload,
  Eye, EyeOff, Star, Zap, Music, Volume2, Sparkles, Package,
  ChevronDown, ChevronUp, Image as ImageIcon, Film, Layers,
  ArrowLeft, RefreshCw, Copy, Check, MoreVertical,
} from 'lucide-react'

// ── Types ──
interface GiftCollection {
  id: string; name: string; nameEn: string; slug: string;
  iconEmoji?: string; sortOrder: number; isActive: boolean;
  _count?: { gifts: number };
}

interface GiftItem {
  id: string; name: string; nameEn: string; icon: string;
  price: number; sortOrder: number; isActive: boolean;
  thumbnailUrl?: string; assetUrl?: string; assetType?: string;
  cloudStoragePath?: string; thumbnailCloudPath?: string;
  category?: string; description?: string;
  soundUrl?: string; soundCloudPath?: string;
  musicUrl?: string; musicCloudPath?: string;
  animationDurationMs?: number; isFullscreen: boolean;
  tier: string; isPopular: boolean; isNew: boolean;
  isSpecialEvent: boolean; isHidden: boolean; isPremium: boolean;
  isFeatured: boolean; effectColor?: string; comboEnabled: boolean;
  displayType: string; screenPosition: string;
  visibleInVoiceRoom: boolean; visibleInLiveStream: boolean;
  visibleInPK: boolean; visibleInProfile: boolean;
  visibleInMessaging: boolean; visibleInTrend: boolean;
  visibleInStories: boolean; visibleInFortune: boolean;
  visibleInNotification: boolean; visibleAsMini: boolean;
  visibleAsFullscreen: boolean;
  requiresVip: boolean; eventOnly: boolean; pkOnly: boolean;
  liveOnly: boolean; voiceOnly: boolean; newUserOnly: boolean;
  timedCampaign: boolean; campaignStart?: string; campaignEnd?: string;
  isSeasonal: boolean; isReusable: boolean; dailySendLimit?: number;
  startDelayMs?: number; displayDurationMs?: number;
  repeatCount: number; volume: number;
  particleEffect?: string; hasVibration: boolean; hasColorChange: boolean;
  animStartPoint?: string; animEndPoint?: string;
  seasonStart?: string; seasonEnd?: string;
  collectionId?: string;
  collection?: { id: string; name: string; slug: string; iconEmoji?: string };
  contentVersion: number;
  iconImageUrl?: string; iconImageCloudPath?: string;
  [key: string]: any;
}

const JETON_PRESETS = [10, 50, 99, 199, 299, 499, 999, 5000, 10000, 25000, 50000, 100000];

const DISPLAY_TYPES = [
  { value: 'static', label: 'Statik' },
  { value: 'animation', label: 'Animasyon' },
  { value: 'video', label: 'Video' },
  { value: '3d', label: '3D' },
  { value: 'lottie', label: 'Lottie' },
  { value: 'effect', label: 'Efekt' },
  { value: 'fullscreen', label: 'Tam Ekran' },
  { value: 'mini', label: 'Mini' },
  { value: 'continuous', label: 'Sürekli Döngü' },
  { value: 'play_once', label: 'Tek Oyna' },
];

const TIERS = [
  { value: 'small', label: 'Küçük' },
  { value: 'big', label: 'Büyük' },
  { value: 'huge', label: 'Dev' },
];

const SCREEN_POSITIONS = [
  { value: 'center', label: 'Orta' },
  { value: 'bottom', label: 'Alt' },
  { value: 'top', label: 'Üst' },
  { value: 'left', label: 'Sol' },
  { value: 'right', label: 'Sağ' },
  { value: 'above_seat', label: 'Koltuk Üstü' },
  { value: 'user_avatar', label: 'Kullanıcı Avatarı' },
  { value: 'room_center', label: 'Oda Ortası' },
  { value: 'fullscreen', label: 'Tam Ekran' },
  { value: 'background', label: 'Arka Plan' },
  { value: 'message_area', label: 'Mesaj Alanı' },
  { value: 'header', label: 'Üst Bilgi' },
  { value: 'footer', label: 'Alt Bilgi' },
];

const PARTICLE_EFFECTS = [
  { value: '', label: 'Yok' },
  { value: 'confetti', label: '🎊 Konfeti' },
  { value: 'heart', label: '❤️ Kalp' },
  { value: 'star', label: '⭐ Yıldız' },
  { value: 'light', label: '💡 Işık' },
  { value: 'glow', label: '✨ Parıltı' },
];

const VISIBILITY_FIELDS = [
  { key: 'visibleInVoiceRoom', label: 'Sesli Oda', emoji: '🎤' },
  { key: 'visibleInLiveStream', label: 'Canlı Yayın', emoji: '📹' },
  { key: 'visibleInPK', label: 'PK', emoji: '⚔️' },
  { key: 'visibleInProfile', label: 'Profil', emoji: '👤' },
  { key: 'visibleInMessaging', label: 'Mesajlaşma', emoji: '💬' },
  { key: 'visibleInTrend', label: 'Trend Video', emoji: '📱' },
  { key: 'visibleInStories', label: 'Hikaye', emoji: '📸' },
  { key: 'visibleInFortune', label: 'Fal Ekranı', emoji: '🔮' },
  { key: 'visibleInNotification', label: 'Bildirim', emoji: '🔔' },
  { key: 'visibleAsMini', label: 'Mini Animasyon', emoji: '💎' },
  { key: 'visibleAsFullscreen', label: 'Tam Ekran Animasyon', emoji: '🌟' },
];

const PROPERTY_FIELDS = [
  { key: 'isPremium', label: 'Premium' },
  { key: 'requiresVip', label: 'VIP Gerekli' },
  { key: 'eventOnly', label: 'Etkinliğe Özel' },
  { key: 'pkOnly', label: 'Sadece PK' },
  { key: 'liveOnly', label: 'Sadece Canlı' },
  { key: 'voiceOnly', label: 'Sadece Sesli' },
  { key: 'newUserOnly', label: 'Yeni Kullanıcı' },
  { key: 'timedCampaign', label: 'Süreli Kampanya' },
  { key: 'isHidden', label: 'Gizli' },
  { key: 'isSeasonal', label: 'Sezonluk' },
  { key: 'isReusable', label: 'Tekrar Kullanılabilir' },
  { key: 'comboEnabled', label: 'Kombo' },
  { key: 'isPopular', label: 'Popüler' },
  { key: 'isNew', label: 'Yeni' },
  { key: 'isSpecialEvent', label: 'Özel Etkinlik' },
  { key: 'isFeatured', label: 'Öne Çıkan' },
  { key: 'isFullscreen', label: 'Tam Ekran' },
  { key: 'hasVibration', label: 'Titreşim' },
  { key: 'hasColorChange', label: 'Renk Değişimi' },
];

const emptyGift: Partial<GiftItem> = {
  name: '', nameEn: '', icon: '🎁', price: 10, sortOrder: 0,
  isActive: true, assetType: 'image', tier: 'small',
  displayType: 'static', screenPosition: 'center',
  visibleInVoiceRoom: true, visibleInLiveStream: true, visibleInPK: true,
  visibleInProfile: false, visibleInMessaging: false, visibleInTrend: false,
  visibleInStories: false, visibleInFortune: false, visibleInNotification: false,
  visibleAsMini: false, visibleAsFullscreen: false,
  isPremium: false, requiresVip: false, eventOnly: false,
  pkOnly: false, liveOnly: false, voiceOnly: false,
  newUserOnly: false, timedCampaign: false, isHidden: false,
  isSeasonal: false, isReusable: true, comboEnabled: false,
  isPopular: false, isNew: true, isSpecialEvent: false,
  isFeatured: false, isFullscreen: false,
  repeatCount: 1, volume: 100,
  hasVibration: false, hasColorChange: false,
};

// ── Upload helper ──
async function uploadGiftFile(file: File, purpose: string): Promise<{ cloudPath: string; publicUrl: string }> {
  const res = await fetch('/api/admin/gift-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', purpose }),
  });
  if (!res.ok) throw new Error('Yükleme URL\'si alınamadı');
  const { uploadUrl, cloud_storage_path } = await res.json();

  const headers: Record<string, string> = { 'Content-Type': file.type || 'application/octet-stream' };
  if (uploadUrl.includes('content-disposition')) {
    headers['Content-Disposition'] = 'attachment';
  }
  const up = await fetch(uploadUrl, { method: 'PUT', body: file, headers });
  if (!up.ok) throw new Error('Dosya yüklenemedi');

  // Build public URL
  const bucketMatch = uploadUrl.match(/https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com/);
  let publicUrl = '';
  if (bucketMatch) {
    const encodedKey = cloud_storage_path.split('/').map(encodeURIComponent).join('/');
    publicUrl = `https://${bucketMatch[1]}.s3.${bucketMatch[2]}.amazonaws.com/${encodedKey}`;
  }

  return { cloudPath: cloud_storage_path, publicUrl };
}

// ── Section Accordion ──
function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition">
        {icon}
        <span className="font-medium text-sm">{title}</span>
        <span className="ml-auto">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      <AnimatePresence>{open && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
          <div className="p-4 space-y-3">{children}</div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ── File Upload Field ──
function FileUploadField({ label, accept, purpose, value, onChange, onCloudPath }: {
  label: string; accept: string; purpose: string;
  value?: string; onChange: (url: string) => void; onCloudPath?: (p: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress('Yükleniyor...');
    try {
      const { cloudPath, publicUrl } = await uploadGiftFile(file, purpose);
      onChange(publicUrl || cloudPath);
      onCloudPath?.(cloudPath);
      setProgress('✅ Yüklendi');
    } catch (err: any) {
      setProgress(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-xs text-white/60 mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="URL veya dosya yükle"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs flex items-center gap-1"
        >
          <Upload size={14} /> Yükle
        </button>
      </div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
      {progress && <p className="text-xs mt-1 text-white/50">{progress}</p>}
      {value && (value.endsWith('.mp4') || value.endsWith('.webm')) ? (
        <video src={value} className="mt-2 h-20 rounded" controls muted />
      ) : value && !value.endsWith('.mp3') && !value.endsWith('.wav') && !value.endsWith('.ogg') ? (
        <img src={value} alt="" className="mt-2 h-16 rounded object-contain bg-white/5" onError={(e) => (e.currentTarget.style.display = 'none')} />
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function AdminGiftCatalogPage() {
  const { language } = useLanguage();
  const lang = language || 'tr';
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [collections, setCollections] = useState<GiftCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCollection, setFilterCollection] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Editor state
  const [editing, setEditing] = useState<Partial<GiftItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Collection editor
  const [showCollections, setShowCollections] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: '', nameEn: '', iconEmoji: '', slug: '' });

  // Stats modal
  const [statsGiftId, setStatsGiftId] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchStats = async (giftId: string) => {
    setStatsGiftId(giftId);
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/gifts/stats?giftId=${giftId}`);
      const data = await res.json();
      setStatsData(data);
    } catch {} finally { setStatsLoading(false); }
  };

  // ── Fetch gifts ──
  const fetchGifts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCollection) params.set('collectionId', filterCollection);
      if (filterType) params.set('displayType', filterType);
      if (filterActive) params.set('isActive', filterActive);
      params.set('page', page.toString());
      params.set('limit', '50');

      const res = await fetch(`/api/admin/gifts?${params}`);
      const data = await res.json();
      setGifts(data.gifts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filterCollection, filterType, filterActive, page]);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gift-collections');
      const data = await res.json();
      setCollections(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { fetchGifts(); }, [fetchGifts]);
  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  // ── Save gift ──
  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const isNew = !editing.id;
      const url = isNew ? '/api/admin/gifts' : `/api/admin/gifts/${editing.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Kaydedilemedi');
      }
      setSaveMsg('✅ Kaydedildi!');
      setEditing(null);
      fetchGifts();
    } catch (err: any) {
      setSaveMsg(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete gift ──
  const handleDelete = async (id: string) => {
    if (!confirm('Bu hediyeyi pasif yapmak istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/gifts/${id}`, { method: 'DELETE' });
      fetchGifts();
    } catch {}
  };

  // ── Save collection ──
  const handleSaveCollection = async () => {
    if (!newCollection.name) return;
    try {
      const res = await fetch('/api/admin/gift-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCollection),
      });
      if (res.ok) {
        setNewCollection({ name: '', nameEn: '', iconEmoji: '', slug: '' });
        fetchCollections();
      }
    } catch {}
  };

  // ── Editor field updater ──
  const setField = (key: string, value: any) => {
    setEditing(prev => prev ? { ...prev, [key]: value } : null);
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${lang}/admin`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </a>
        <Gift className="text-purple-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Hediye Kataloğu Yönetimi</h1>
          <p className="text-white/50 text-sm">Tüm hediye türlerini oluşturun, düzenleyin, medya yükleyin</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowCollections(!showCollections)}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2"
          >
            <Package size={16} /> Koleksiyonlar
          </button>
          <button
            onClick={() => setEditing({ ...emptyGift })}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} /> Yeni Hediye
          </button>
        </div>
      </div>

      {/* Collections Panel */}
      <AnimatePresence>
        {showCollections && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package size={18} /> Hediye Koleksiyonları
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
              {collections.map(c => (
                <div key={c.id} className="bg-white/5 rounded-lg p-3 text-center">
                  <span className="text-2xl">{c.iconEmoji || '📦'}</span>
                  <p className="text-sm font-medium mt-1">{c.name}</p>
                  <p className="text-xs text-white/40">{c._count?.gifts || 0} hediye</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-white/50">Koleksiyon Adı</label>
                <input value={newCollection.name} onChange={e => setNewCollection(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Romantik" />
              </div>
              <div className="w-24">
                <label className="text-xs text-white/50">Emoji</label>
                <input value={newCollection.iconEmoji} onChange={e => setNewCollection(p => ({ ...p, iconEmoji: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="💕" />
              </div>
              <button onClick={handleSaveCollection} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm">
                <Plus size={14} /> Ekle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Hediye ara..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={filterCollection} onChange={e => { setFilterCollection(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">Tüm Koleksiyonlar</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">Tüm Türler</option>
          {DISPLAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterActive} onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
          <option value="">Tümü</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
        <button onClick={fetchGifts} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm text-white/50">
        <span>Toplam: <strong className="text-white">{total}</strong></span>
        <span>Sayfa: {page}/{Math.ceil(total / 50) || 1}</span>
      </div>

      {/* Gift Grid */}
      {loading ? (
        <div className="text-center py-20 text-white/40">Yükleniyor...</div>
      ) : gifts.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <Gift size={48} className="mx-auto mb-3 opacity-30" />
          <p>Henüz hediye yok. Yeni hediye ekleyin!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {gifts.map(g => (
            <motion.div
              key={g.id}
              whileHover={{ scale: 1.02 }}
              className={`bg-white/5 rounded-xl p-3 border transition cursor-pointer relative group ${
                g.isActive ? 'border-white/10 hover:border-purple-500/50' : 'border-red-500/30 opacity-60'
              }`}
              onClick={() => setEditing({ ...g })}
            >
              {/* Thumbnail */}
              <div className="aspect-square rounded-lg bg-white/5 mb-2 flex items-center justify-center overflow-hidden relative">
                {g.thumbnailUrl || g.assetUrl || g.iconImageUrl ? (
                  (g.assetType === 'video' && g.assetUrl) ? (
                    <video src={g.assetUrl} className="w-full h-full object-contain" muted loop />
                  ) : (
                    <img src={g.thumbnailUrl || g.iconImageUrl || g.assetUrl || ''} alt={g.name}
                      className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )
                ) : (
                  <span className="text-4xl">{g.icon}</span>
                )}
                {/* Badges */}
                <div className="absolute top-1 right-1 flex flex-col gap-1">
                  {g.isPremium && <span className="bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded font-bold">👑</span>}
                  {g.isNew && <span className="bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">YENİ</span>}
                  {g.isHidden && <span className="bg-gray-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">👁️</span>}
                </div>
              </div>
              {/* Info */}
              <p className="text-sm font-medium truncate">{g.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-purple-300 font-bold">{g.price.toLocaleString()} 🪙</span>
                <span className="text-[10px] text-white/40">{g.tier}</span>
              </div>
              {g.collection && (
                <p className="text-[10px] text-white/30 mt-1 truncate">{g.collection.iconEmoji} {g.collection.name}</p>
              )}
              {/* Actions overlay */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); setEditing({ ...g }); }}
                  className="p-1.5 bg-purple-600 rounded-md"><Edit size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); fetchStats(g.id); }}
                  className="p-1.5 bg-blue-600 rounded-md" title="İstatistikler"><Layers size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                  className="p-1.5 bg-red-600 rounded-md"><Trash2 size={12} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 bg-white/5 rounded-lg text-sm disabled:opacity-30">Önceki</button>
          <span className="px-3 py-1 text-sm">{page} / {Math.ceil(total / 50)}</span>
          <button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 bg-white/5 rounded-lg text-sm disabled:opacity-30">Sonraki</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          EDITOR MODAL
         ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-3xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl my-8"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {editing.id ? <Edit size={18} /> : <Plus size={18} />}
                  {editing.id ? 'Hediye Düzenle' : 'Yeni Hediye'}
                </h2>
                <div className="flex items-center gap-2">
                  {saveMsg && <span className="text-sm">{saveMsg}</span>}
                  <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                    <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-white/10">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="p-4 space-y-2 max-h-[75vh] overflow-y-auto">

                {/* ── Temel Bilgiler ── */}
                <Section title="Temel Bilgiler" icon={<Gift size={16} className="text-purple-400" />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/60">Hediye Adı (TR)</label>
                      <input value={editing.name || ''} onChange={e => setField('name', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Kalp" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Hediye Adı (EN)</label>
                      <input value={editing.nameEn || ''} onChange={e => setField('nameEn', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Heart" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Emoji İkonu</label>
                      <input value={editing.icon || ''} onChange={e => setField('icon', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="🎁" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Sıralama</label>
                      <input type="number" value={editing.sortOrder ?? 0} onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-white/60">Açıklama</label>
                      <textarea value={editing.description || ''} onChange={e => setField('description', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" rows={2} />
                    </div>
                    <div className="flex items-center gap-3 col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editing.isActive ?? true}
                          onChange={e => setField('isActive', e.target.checked)}
                          className="rounded" />
                        <span className="text-sm">Aktif</span>
                      </label>
                    </div>
                  </div>
                </Section>

                {/* ── Medya Yükleme ── */}
                <Section title="Medya Dosyaları" icon={<Upload size={16} className="text-blue-400" />} defaultOpen={!editing.id}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FileUploadField
                      label="🖼️ Ana Görsel / Animasyon Dosyası (PNG/SVG/GIF/MP4/Lottie/WebP/APNG)"
                      accept="image/*,video/mp4,video/webm,.json,.svga"
                      purpose="asset"
                      value={editing.assetUrl || ''}
                      onChange={v => setField('assetUrl', v)}
                      onCloudPath={v => setField('cloudStoragePath', v)}
                    />
                    <div>
                      <label className="text-xs text-white/60">Dosya Türü</label>
                      <select value={editing.assetType || 'image'} onChange={e => setField('assetType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="image">Görsel (PNG/WebP/SVG)</option>
                        <option value="gif">GIF / APNG</option>
                        <option value="video">Video (MP4)</option>
                        <option value="lottie">Lottie (JSON)</option>
                        <option value="svga">SVGA</option>
                      </select>
                    </div>
                    <FileUploadField
                      label="🖼️ Küçük Önizleme (Thumbnail)"
                      accept="image/*"
                      purpose="thumbnail"
                      value={editing.thumbnailUrl || ''}
                      onChange={v => setField('thumbnailUrl', v)}
                      onCloudPath={v => setField('thumbnailCloudPath', v)}
                    />
                    <FileUploadField
                      label="🖼️ Panel İkonu (listede görünecek)"
                      accept="image/*"
                      purpose="icon"
                      value={editing.iconImageUrl || ''}
                      onChange={v => setField('iconImageUrl', v)}
                      onCloudPath={v => setField('iconImageCloudPath', v)}
                    />
                    <FileUploadField
                      label="🔊 Ses Efekti (MP3/WAV)"
                      accept="audio/*,.mp3,.wav,.ogg"
                      purpose="sound"
                      value={editing.soundUrl || ''}
                      onChange={v => setField('soundUrl', v)}
                      onCloudPath={v => setField('soundCloudPath', v)}
                    />
                    <FileUploadField
                      label="🎵 Hediye Müziği (MP3/WAV)"
                      accept="audio/*,.mp3,.wav,.ogg"
                      purpose="music"
                      value={editing.musicUrl || ''}
                      onChange={v => setField('musicUrl', v)}
                      onCloudPath={v => setField('musicCloudPath', v)}
                    />
                  </div>
                </Section>

                {/* ── Jeton Fiyatı ── */}
                <Section title="Jeton Fiyatı" icon={<Sparkles size={16} className="text-yellow-400" />}>
                  <div>
                    <label className="text-xs text-white/60 mb-2 block">Hazır Fiyatlar</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {JETON_PRESETS.map(p => (
                        <button key={p} onClick={() => setField('price', p)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            editing.price === p ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white/70'
                          }`}>
                          {p.toLocaleString()} 🪙
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Özel Fiyat</label>
                      <input type="number" value={editing.price ?? 10} onChange={e => setField('price', parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </Section>

                {/* ── Görüneceği Yerler ── */}
                <Section title="Görüneceği Yerler" icon={<Eye size={16} className="text-green-400" />}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {VISIBILITY_FIELDS.map(v => (
                      <label key={v.key} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition">
                        <input type="checkbox" checked={editing[v.key] ?? false}
                          onChange={e => setField(v.key, e.target.checked)} className="rounded" />
                        <span className="text-sm">{v.emoji} {v.label}</span>
                      </label>
                    ))}
                  </div>
                </Section>

                {/* ── Hediye Türü + Seviye ── */}
                <Section title="Hediye Türü & Seviye" icon={<Layers size={16} className="text-cyan-400" />}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/60">Görüntülenme Türü</label>
                      <select value={editing.displayType || 'static'} onChange={e => setField('displayType', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {DISPLAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Seviye (Tier)</label>
                      <select value={editing.tier || 'small'} onChange={e => setField('tier', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Koleksiyon</label>
                      <select value={editing.collectionId || ''} onChange={e => setField('collectionId', e.target.value || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="">Koleksiyon Yok</option>
                        {collections.filter(c => c.isActive).map(c => (
                          <option key={c.id} value={c.id}>{c.iconEmoji} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Efekt Rengi (hex)</label>
                      <div className="flex gap-2">
                        <input type="color" value={editing.effectColor || '#FF6B6B'}
                          onChange={e => setField('effectColor', e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer" />
                        <input value={editing.effectColor || ''} onChange={e => setField('effectColor', e.target.value)}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="#FF6B6B" />
                      </div>
                    </div>
                  </div>
                </Section>

                {/* ── Hediye Özellikleri ── */}
                <Section title="Hediye Özellikleri" icon={<Star size={16} className="text-yellow-400" />}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROPERTY_FIELDS.map(p => (
                      <label key={p.key} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                        <input type="checkbox" checked={editing[p.key] ?? false}
                          onChange={e => setField(p.key, e.target.checked)} className="rounded" />
                        <span className="text-sm">{p.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-white/60">Günlük Gönderim Limiti</label>
                      <input type="number" value={editing.dailySendLimit ?? ''}
                        onChange={e => setField('dailySendLimit', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Sınırsız" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Kategori (serbest metin)</label>
                      <input value={editing.category || ''} onChange={e => setField('category', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="romantic, luxury" />
                    </div>
                  </div>
                  {editing.timedCampaign && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-white/60">Kampanya Başlangıç</label>
                        <input type="datetime-local" value={editing.campaignStart ? new Date(editing.campaignStart).toISOString().slice(0, 16) : ''}
                          onChange={e => setField('campaignStart', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-white/60">Kampanya Bitiş</label>
                        <input type="datetime-local" value={editing.campaignEnd ? new Date(editing.campaignEnd).toISOString().slice(0, 16) : ''}
                          onChange={e => setField('campaignEnd', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                  {editing.isSeasonal && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-white/60">Sezon Başlangıç</label>
                        <input type="datetime-local" value={editing.seasonStart ? new Date(editing.seasonStart).toISOString().slice(0, 16) : ''}
                          onChange={e => setField('seasonStart', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-white/60">Sezon Bitiş</label>
                        <input type="datetime-local" value={editing.seasonEnd ? new Date(editing.seasonEnd).toISOString().slice(0, 16) : ''}
                          onChange={e => setField('seasonEnd', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </Section>

                {/* ── Animasyon Ayarları ── */}
                <Section title="Animasyon Ayarları" icon={<Zap size={16} className="text-orange-400" />}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-white/60">Animasyon Süresi (ms)</label>
                      <input type="number" value={editing.animationDurationMs ?? ''}
                        onChange={e => setField('animationDurationMs', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="3000" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Başlama Gecikmesi (ms)</label>
                      <input type="number" value={editing.startDelayMs ?? ''}
                        onChange={e => setField('startDelayMs', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Ekranda Kalma (ms)</label>
                      <input type="number" value={editing.displayDurationMs ?? ''}
                        onChange={e => setField('displayDurationMs', e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="5000" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Tekrar Sayısı (0=sonsuz)</label>
                      <input type="number" value={editing.repeatCount ?? 1}
                        onChange={e => setField('repeatCount', parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Ses Seviyesi (0-100)</label>
                      <input type="range" min={0} max={100} value={editing.volume ?? 100}
                        onChange={e => setField('volume', parseInt(e.target.value))}
                        className="w-full" />
                      <span className="text-xs text-white/40">{editing.volume ?? 100}%</span>
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Parçacık Efekti</label>
                      <select value={editing.particleEffect || ''} onChange={e => setField('particleEffect', e.target.value || null)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {PARTICLE_EFFECTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* ── Ekran Konumu ── */}
                <Section title="Ekrandaki Konumu" icon={<Layers size={16} className="text-teal-400" />}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-white/60">Ekran Konumu</label>
                      <select value={editing.screenPosition || 'center'} onChange={e => setField('screenPosition', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {SCREEN_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Animasyon Başlangıç Noktası</label>
                      <input value={editing.animStartPoint || ''} onChange={e => setField('animStartPoint', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="örn: bottom-left" />
                    </div>
                    <div>
                      <label className="text-xs text-white/60">Animasyon Bitiş Noktası</label>
                      <input value={editing.animEndPoint || ''} onChange={e => setField('animEndPoint', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="örn: top-center" />
                    </div>
                  </div>
                </Section>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ STATS MODAL ═══ */}
      <AnimatePresence>
        {statsGiftId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center overflow-y-auto p-4"
            onClick={() => { setStatsGiftId(null); setStatsData(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Layers size={18} className="text-blue-400" /> Hediye İstatistikleri
                </h2>
                <button onClick={() => { setStatsGiftId(null); setStatsData(null); }}
                  className="p-2 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
              <div className="p-4">
                {statsLoading ? <p className="text-center text-white/40 py-8">Yükleniyor...</p> : !statsData ? <p className="text-center text-white/40 py-8">Veri yok</p> : (
                  <div className="space-y-4">
                    {/* Overview cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[{ label: 'Toplam Gönderim', value: statsData.sendCount?.toLocaleString() || '0', color: 'text-blue-400' },
                        { label: 'Toplam Jeton', value: `${(statsData.totalJetons || 0).toLocaleString()} 🪙`, color: 'text-yellow-400' },
                        { label: 'Site Kazancı', value: `${(statsData.totalSiteEarnings || 0).toLocaleString()} 🪙`, color: 'text-green-400' },
                        { label: 'Alıcı Kazancı', value: `${(statsData.totalReceiverEarnings || 0).toLocaleString()} 🪙`, color: 'text-purple-400' },
                      ].map((c, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-xs text-white/50">{c.label}</p>
                          <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Context breakdown */}
                    {statsData.contextBreakdown?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Kullanıldığı Yerler</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {statsData.contextBreakdown.map((c: any, i: number) => (
                            <div key={i} className="bg-white/5 rounded-lg p-2 flex justify-between">
                              <span className="text-sm capitalize">{c.context?.replace('_', ' ') || 'Bilinmeyen'}</span>
                              <span className="text-sm font-bold text-blue-300">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily trend */}
                    {statsData.dailyTrend?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Son 7 Gün Trend</h3>
                        <div className="flex gap-1 items-end h-24">
                          {statsData.dailyTrend.map((d: any, i: number) => {
                            const maxCount = Math.max(...statsData.dailyTrend.map((x: any) => x.count || 1));
                            const h = Math.max(((d.count || 0) / maxCount) * 100, 5);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-white/40">{d.count}</span>
                                <div className="w-full bg-blue-500/60 rounded-t" style={{ height: `${h}%` }} />
                                <span className="text-[8px] text-white/30">{String(d.day).slice(5, 10)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top senders */}
                    {statsData.topSenders?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">En Çok Gönderenler</h3>
                        <div className="space-y-1">
                          {statsData.topSenders.slice(0, 5).map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                              <span className="text-xs font-bold text-white/50 w-5">{i + 1}.</span>
                              <span className="text-sm flex-1 truncate">{s.user?.name || 'Bilinmeyen'}</span>
                              <span className="text-xs text-yellow-300">{s.count}× • {(s.totalSpent || 0).toLocaleString()} 🪙</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top receivers */}
                    {statsData.topReceivers?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">En Çok Alanlar</h3>
                        <div className="space-y-1">
                          {statsData.topReceivers.slice(0, 5).map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                              <span className="text-xs font-bold text-white/50 w-5">{i + 1}.</span>
                              <span className="text-sm flex-1 truncate">{r.user?.name || 'Bilinmeyen'}</span>
                              <span className="text-xs text-green-300">{r.count}× • {(r.totalReceived || 0).toLocaleString()} 🪙</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PREVIEW MODAL ═══ */}
      {/* Preview is shown inline in the editor modal — the gift card + media are visible there */}
    </div>
  );
}
