'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clover, Plus, Trash2, RefreshCw, Save, X, Trophy, Percent, TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface Tier {
  id: string;
  name: string;
  nameEn: string;
  multiplier: number;
  weight: number;
  isJackpot: boolean;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
  oddsPercent?: number;
}

const emptyTier: Partial<Tier> = {
  name: '', nameEn: '', multiplier: 2, weight: 10,
  isJackpot: false, color: '#FFD700', icon: '🍀', isActive: true, sortOrder: 0,
};

export default function AdminLuckyGiftsPage() {
  const { language } = useLanguage();
  const lang = language || 'tr';
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rtp, setRtp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Tier> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [wins, setWins] = useState<any[]>([]);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lucky-gifts/tiers');
      const data = await res.json();
      setTiers(data.tiers || []);
      setRtp(data.rtp || 0);
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchWins = useCallback(async () => {
    try {
      const res = await fetch('/api/gifts/lucky/history?scope=global&limit=20');
      const data = await res.json();
      setWins(data.feed || []);
    } catch {}
  }, []);

  useEffect(() => { fetchTiers(); fetchWins(); }, [fetchTiers, fetchWins]);

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMsg('');
    try {
      const isNew = !editing.id;
      const res = await fetch('/api/admin/lucky-gifts/tiers', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Hata'); }
      setMsg('✅ Kaydedildi');
      setEditing(null);
      fetchTiers();
    } catch (e: any) { setMsg(`❌ ${e.message}`); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Bu kademe silinsin mi?')) return;
    await fetch(`/api/admin/lucky-gifts/tiers?id=${id}`, { method: 'DELETE' });
    fetchTiers();
  };

  const seedDefaults = async () => {
    if (!confirm('Varsayılan şanslı hediye kademeleri eklensin mi? (×0, ×1, ×2, ×5, ×10, ×50, Jackpot ×500)')) return;
    const defaults = [
      { name: 'Boş', nameEn: 'Miss', multiplier: 0, weight: 40, icon: '💨', color: '#6B7280', sortOrder: 1 },
      { name: '1x İade', nameEn: '1x', multiplier: 1, weight: 25, icon: '🔄', color: '#9CA3AF', sortOrder: 2 },
      { name: '2x', nameEn: '2x', multiplier: 2, weight: 18, icon: '✨', color: '#34D399', sortOrder: 3 },
      { name: '5x', nameEn: '5x', multiplier: 5, weight: 10, icon: '🌟', color: '#60A5FA', sortOrder: 4 },
      { name: '10x', nameEn: '10x', multiplier: 10, weight: 5, icon: '💎', color: '#A78BFA', sortOrder: 5 },
      { name: '50x', nameEn: '50x', multiplier: 50, weight: 1.8, icon: '🔥', color: '#F472B6', sortOrder: 6 },
      { name: 'JACKPOT 500x', nameEn: 'JACKPOT 500x', multiplier: 500, weight: 0.2, isJackpot: true, icon: '🍰', color: '#FFD700', sortOrder: 7 },
    ];
    for (const d of defaults) {
      await fetch('/api/admin/lucky-gifts/tiers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...d, weight: Math.round(d.weight * 10) }),
      });
    }
    fetchTiers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-900/20 to-gray-900 text-white p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <a href={`/${lang}/admin`} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <ArrowLeft size={20} />
        </a>
        <Clover className="text-emerald-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Şanslı Hediye Yönetimi</h1>
          <p className="text-white/50 text-sm">Ödül kademelerini, olasılıkları ve jackpot ayarlarını yönetin</p>
        </div>
        <div className="ml-auto flex gap-2">
          {tiers.length === 0 && (
            <button onClick={seedDefaults} className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm">
              Varsayılanları Ekle
            </button>
          )}
          <button onClick={() => setEditing({ ...emptyTier })} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Yeni Kademe
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1"><Percent size={14} /> Aktif Kademe</div>
          <p className="text-2xl font-bold">{tiers.filter(t => t.isActive).length}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1"><TrendingUp size={14} /> Beklenen Getiri (RTP)</div>
          <p className={`text-2xl font-bold ${rtp > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{rtp}x</p>
          <p className="text-[11px] text-white/40">1x'in üzeri kullanıcı lehine — dikkatli ayarlayın</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-1"><Trophy size={14} /> Jackpot Kademe</div>
          <p className="text-2xl font-bold text-yellow-400">{tiers.filter(t => t.isJackpot).length}</p>
        </div>
      </div>

      {/* Tiers list */}
      {loading ? (
        <div className="text-center py-16 text-white/40">Yükleniyor...</div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          Henüz kademe yok. “Varsayılanları Ekle” ile başllayabilirsiniz.
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {tiers.map(t => (
            <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${t.isJackpot ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/5'} ${!t.isActive ? 'opacity-50' : ''}`}>
              <span className="text-2xl w-9 text-center" style={{ color: t.color || undefined }}>{t.icon || '🍀'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  {t.name}
                  {t.isJackpot && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">JACKPOT</span>}
                  {!t.isActive && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Pasif</span>}
                </div>
                <div className="text-xs text-white/50">Çarpan: <strong className="text-white">{t.multiplier}x</strong> · Ağırlık: {t.weight}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">%{t.oddsPercent}</div>
                <div className="text-[10px] text-white/40">kazanma şansı</div>
              </div>
              <button onClick={() => setEditing(t)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs">Düzenle</button>
              <button onClick={() => del(t.id)} className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Recent big wins */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Trophy size={18} className="text-yellow-400" /> Son Büyük Kazançlar</h3>
        {wins.length === 0 ? (
          <p className="text-white/40 text-sm">Henüz kayıt yok.</p>
        ) : (
          <div className="space-y-1.5">
            {wins.map(w => (
              <div key={w.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-lg">{w.gift?.icon || '🎁'}</span>
                <span className="font-medium">{w.user?.name || 'Kullanıcı'}</span>
                <span className="text-white/40">{w.gift?.name}</span>
                {w.isJackpot && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">JACKPOT</span>}
                <span className="ml-auto text-emerald-400 font-bold">{w.multiplier}x → {w.wonJetons?.toLocaleString('tr-TR')} 🪙</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{editing.id ? 'Kademe Düzenle' : 'Yeni Kademe'}</h3>
                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Ad (TR)</label>
                    <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Ad (EN)</label>
                    <input value={editing.nameEn || ''} onChange={e => setEditing({ ...editing, nameEn: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Çarpan (x)</label>
                    <input type="number" min={0} value={editing.multiplier ?? 0} onChange={e => setEditing({ ...editing, multiplier: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Ağırlık (olasılık payı)</label>
                    <input type="number" min={0} value={editing.weight ?? 1} onChange={e => setEditing({ ...editing, weight: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">İkon</label>
                    <input value={editing.icon || ''} onChange={e => setEditing({ ...editing, icon: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Renk</label>
                    <input type="color" value={editing.color || '#FFD700'} onChange={e => setEditing({ ...editing, color: e.target.value })}
                      className="w-full h-[38px] bg-white/5 border border-white/10 rounded-lg px-1" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Sıra</label>
                    <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!editing.isJackpot} onChange={e => setEditing({ ...editing, isJackpot: e.target.checked })} />
                    🍰 Jackpot
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.isActive !== false} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />
                    Aktif
                  </label>
                </div>
                {msg && <p className="text-sm text-white/70">{msg}</p>}
                <button onClick={save} disabled={saving}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
