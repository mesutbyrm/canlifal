'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Shield,
  Ban,
  AlertTriangle,
  Gift,
  Snowflake,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Settings,
  Lock,
} from 'lucide-react';

interface Teller {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  specialties: string[];
  pricePerSession: number;
  rating: number;
  totalSessions: number;
  totalReviews: number;
  totalEarnings: number;
  isOnline: boolean;
  isVerified: boolean;
  isActive: boolean;
  avatar: string | null;
  applicationStatus: string;
  applicationNote: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  isFrozen: boolean;
  freezeReason: string | null;
  frozenAt: string | null;
  bonusCredits: number;
  createdAt: string;
  // Permissions
  canGoOnline: boolean;
  canChat: boolean;
  canStartSession: boolean;
  canSetPrice: boolean;
  canEditProfile: boolean;
  canViewEarnings: boolean;
  canWithdraw: boolean;
  maxSessionsPerDay: number;
  commissionRate: number;
  adminNotes: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  warnings: {
    id: string;
    reason: string;
    issuedBy: string;
    createdAt: string;
  }[];
  _count: {
    sessions: number;
    reviews: number;
  };
}

const SPECIALTY_NAMES: Record<string, string> = {
  coffee: 'Kahve',
  tarot: 'Tarot',
  astrology: 'Astroloji',
  palmistry: 'El Falı',
  dream: 'Rüya',
  numerology: 'Numeroloji',
};

export default function AdminLiveTellersPage() {
  const { language } = useLanguage();
  const [tellers, setTellers] = useState<Teller[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeller, setSelectedTeller] = useState<Teller | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'edit' | 'warning' | 'ban' | 'freeze' | 'bonus' | 'approve' | 'add' | 'permissions'>('view');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedTeller, setExpandedTeller] = useState<string | null>(null);

  // Form states
  const [warningReason, setWarningReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusReason, setBonusReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    specialties: [] as string[],
    pricePerSession: 100,
    isVerified: false,
    isActive: true,
  });
  const [permissionsForm, setPermissionsForm] = useState({
    canGoOnline: true,
    canChat: true,
    canStartSession: true,
    canSetPrice: false,
    canEditProfile: true,
    canViewEarnings: true,
    canWithdraw: false,
    maxSessionsPerDay: 10,
    commissionRate: 20,
    adminNotes: '',
  });

  useEffect(() => {
    fetchTellers();
  }, [filter]);

  const fetchTellers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        if (filter === 'banned') params.set('banned', 'true');
        else if (filter === 'frozen') params.set('frozen', 'true');
        else params.set('status', filter);
      }
      const res = await fetch(`/api/admin/live-tellers?${params}`);
      const data = await res.json();
      setTellers(data.tellers || []);
    } catch (error) {
      console.error('Error fetching tellers:', error);
    }
    setLoading(false);
  };

  const openModal = (type: typeof modalType, teller?: Teller) => {
    setModalType(type);
    if (teller) {
      setSelectedTeller(teller);
      if (type === 'edit') {
        setEditForm({
          displayName: teller.displayName,
          bio: teller.bio || '',
          specialties: teller.specialties,
          pricePerSession: teller.pricePerSession,
          isVerified: teller.isVerified,
          isActive: teller.isActive,
        });
      }
      if (type === 'permissions') {
        setPermissionsForm({
          canGoOnline: teller.canGoOnline ?? true,
          canChat: teller.canChat ?? true,
          canStartSession: teller.canStartSession ?? true,
          canSetPrice: teller.canSetPrice ?? false,
          canEditProfile: teller.canEditProfile ?? true,
          canViewEarnings: teller.canViewEarnings ?? true,
          canWithdraw: teller.canWithdraw ?? false,
          maxSessionsPerDay: teller.maxSessionsPerDay ?? 10,
          commissionRate: teller.commissionRate ?? 20,
          adminNotes: teller.adminNotes || '',
        });
      }
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTeller(null);
    setWarningReason('');
    setBanReason('');
    setFreezeReason('');
    setBonusAmount(0);
    setBonusReason('');
    setApprovalNote('');
  };

  const handleApprove = async (action: 'approve' | 'reject') => {
    if (!selectedTeller) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: approvalNote }),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleBan = async (action: 'ban' | 'unban') => {
    if (!selectedTeller) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: banReason }),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleFreeze = async (action: 'freeze' | 'unfreeze') => {
    if (!selectedTeller) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: freezeReason }),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleWarning = async () => {
    if (!selectedTeller || !warningReason) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/warning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: warningReason }),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleBonus = async () => {
    if (!selectedTeller || bonusAmount <= 0) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bonusAmount, reason: bonusReason }),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleEdit = async () => {
    if (!selectedTeller) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handlePermissions = async () => {
    if (!selectedTeller) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/live-tellers/${selectedTeller.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionsForm),
      });
      closeModal();
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
    setActionLoading(false);
  };

  const handleDelete = async (tellerId: string) => {
    if (!confirm('Bu falcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/live-tellers/${tellerId}`, { method: 'DELETE' });
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRemoveWarning = async (tellerId: string, warningId: string) => {
    try {
      await fetch(`/api/admin/live-tellers/${tellerId}/warning?warningId=${warningId}`, { method: 'DELETE' });
      fetchTellers();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredTellers = tellers.filter(t => 
    t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: tellers.length,
    pending: tellers.filter(t => t.applicationStatus === 'pending').length,
    approved: tellers.filter(t => t.applicationStatus === 'approved').length,
    banned: tellers.filter(t => t.isBanned).length,
    frozen: tellers.filter(t => t.isFrozen).length,
  };

  const getStatusBadge = (teller: Teller) => {
    if (teller.isBanned) return { color: 'bg-red-500/20 text-red-400 border-red-500/30', text: 'Yasaklı' };
    if (teller.isFrozen) return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', text: 'Dondurulmuş' };
    if (teller.applicationStatus === 'pending') return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', text: 'Beklemede' };
    if (teller.applicationStatus === 'rejected') return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'Reddedildi' };
    if (teller.isActive) return { color: 'bg-green-500/20 text-green-400 border-green-500/30', text: 'Aktif' };
    return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'Pasif' };
  };

  return (
    <div className="min-h-screen  py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif text-gold-400 flex items-center gap-3">
              <Users className="w-8 h-8" />
              {'Canlı Falcı Yönetimi'}
            </h1>
            <p className="text-gray-400 mt-1">
              {'Başvuruları onaylayın, falcıları yönetin'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Toplam', value: stats.total, icon: Users, color: 'text-purple-400' },
            { label: 'Bekleyen', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
            { label: 'Onaylı', value: stats.approved, icon: Check, color: 'text-green-400' },
            { label: 'Yasaklı', value: stats.banned, icon: Ban, color: 'text-red-400' },
            { label: 'Dondurulmuş', value: stats.frozen, icon: Snowflake, color: 'text-blue-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-deep-purple-900/30 border border-deep-purple-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-gray-400 text-sm">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={'İsim veya e-posta ile ara...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'Tümü' },
              { value: 'pending', label: 'Bekleyen' },
              { value: 'approved', label: 'Onaylı' },
              { value: 'banned', label: 'Yasaklı' },
              { value: 'frozen', label: 'Dondurulmuş' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  filter === f.value
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/50'
                    : 'bg-deep-purple-900/50 text-gray-400 border border-deep-purple-700/50 hover:border-gold-500/30'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tellers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTellers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {'Falcı bulunamadı'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTellers.map((teller) => {
              const statusBadge = getStatusBadge(teller);
              const isExpanded = expandedTeller === teller.id;

              return (
                <motion.div
                  key={teller.id}
                  layout
                  className="bg-deep-purple-900/30 border border-deep-purple-700/50 rounded-xl overflow-hidden"
                >
                  {/* Main Row */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Avatar & Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-500/20 to-purple-500/20 flex items-center justify-center text-gold-400 font-bold text-xl border border-gold-500/30">
                        {teller.displayName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white">{teller.displayName}</h3>
                          {teller.isVerified && (
                            <Shield className="w-4 h-4 text-blue-400" />
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                          {teller.warnings.length > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {teller.warnings.length}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{teller.user.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {teller.rating.toFixed(1)}
                          </span>
                          <span>{teller.totalSessions} {'seans'}</span>
                          <span>{teller.totalEarnings} {'kazanç'}</span>
                          <span>{teller.bonusCredits} {'bonus'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {teller.applicationStatus === 'pending' && (
                        <button
                          onClick={() => openModal('approve', teller)}
                          className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          {'Onayla'}
                        </button>
                      )}
                      <button
                        onClick={() => openModal('view', teller)}
                        className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
                        title={'Görüntüle'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('edit', teller)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                        title={'Düzenle'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('permissions', teller)}
                        className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                        title={'Yetkiler'}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('warning', teller)}
                        className="p-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30"
                        title={'Uyarı Ver'}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('bonus', teller)}
                        className="p-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30"
                        title={'Ödül Ver'}
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('freeze', teller)}
                        className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
                        title={'Dondur'}
                      >
                        <Snowflake className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal('ban', teller)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                        title={'Yasakla'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(teller.id)}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                        title={'Sil'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedTeller(isExpanded ? null : teller.id)}
                        className="p-2 bg-deep-purple-700/50 text-gray-400 rounded-lg hover:bg-deep-purple-700"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-deep-purple-700/50"
                      >
                        <div className="p-4 grid md:grid-cols-2 gap-4">
                          {/* Details */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gold-400">{'Detaylar'}</h4>
                            <div className="text-sm space-y-2">
                              <p><span className="text-gray-400">{'Biyografi:'}</span> <span className="text-white">{teller.bio || '-'}</span></p>
                              <p><span className="text-gray-400">{'Uzmanlık:'}</span> <span className="text-white">{teller.specialties.map(s => SPECIALTY_NAMES[s] || s).join(', ') || '-'}</span></p>
                              <p><span className="text-gray-400">{'Seans Ücreti:'}</span> <span className="text-gold-400">{teller.pricePerSession} jeton</span></p>
                              <p><span className="text-gray-400">{'Kayıt:'}</span> <span className="text-white">{new Date(teller.createdAt).toLocaleDateString()}</span></p>
                            </div>
                          </div>

                          {/* Warnings */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-orange-400 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              {'Uyarılar'} ({teller.warnings.length})
                            </h4>
                            {teller.warnings.length === 0 ? (
                              <p className="text-sm text-gray-500">{'Uyarı yok'}</p>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {teller.warnings.map((w) => (
                                  <div key={w.id} className="flex items-start justify-between gap-2 p-2 bg-orange-500/10 rounded-lg">
                                    <div>
                                      <p className="text-sm text-white">{w.reason}</p>
                                      <p className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveWarning(teller.id, w.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status Info */}
                          {(teller.isBanned || teller.isFrozen) && (
                            <div className="md:col-span-2 p-3 bg-red-500/10 rounded-lg">
                              {teller.isBanned && (
                                <p className="text-sm"><span className="text-red-400 font-semibold">{'Yasaklanma Sebebi:'}</span> <span className="text-white">{teller.banReason || '-'}</span></p>
                              )}
                              {teller.isFrozen && (
                                <p className="text-sm mt-1"><span className="text-blue-400 font-semibold">{'Dondurma Sebebi:'}</span> <span className="text-white">{teller.freezeReason || '-'}</span></p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-deep-purple-900 border border-deep-purple-700 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* View Modal */}
                {modalType === 'view' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-gold-400 mb-4 flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      {selectedTeller.displayName}
                    </h3>
                    <div className="space-y-3 text-sm">
                      <p><span className="text-gray-400">Email:</span> <span className="text-white">{selectedTeller.user.email}</span></p>
                      <p><span className="text-gray-400">{'Biyografi:'}</span> <span className="text-white">{selectedTeller.bio || '-'}</span></p>
                      <p><span className="text-gray-400">{'Uzmanlık:'}</span> <span className="text-white">{selectedTeller.specialties.join(', ') || '-'}</span></p>
                      <p><span className="text-gray-400">{'Puan:'}</span> <span className="text-yellow-400">{selectedTeller.rating.toFixed(1)} ⭐</span></p>
                      <p><span className="text-gray-400">{'Toplam Seans:'}</span> <span className="text-white">{selectedTeller.totalSessions}</span></p>
                      <p><span className="text-gray-400">{'Toplam Kazanç:'}</span> <span className="text-gold-400">{selectedTeller.totalEarnings} jeton</span></p>
                      <p><span className="text-gray-400">{'Bonus CFC:'}</span> <span className="text-green-400">{selectedTeller.bonusCredits}</span></p>
                      <p><span className="text-gray-400">{'Durum:'}</span> <span className="text-white">{selectedTeller.applicationStatus}</span></p>
                      <p><span className="text-gray-400">{'Onaylı:'}</span> <span className={selectedTeller.isVerified ? 'text-green-400' : 'text-gray-400'}>{selectedTeller.isVerified ? '✓' : '✗'}</span></p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="mt-6 w-full py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                    >
                      {'Kapat'}
                    </button>
                  </div>
                )}

                {/* Edit Modal */}
                {modalType === 'edit' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-gold-400 mb-4 flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      {'Düzenle'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400">{'Görünen İsim'}</label>
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">{'Biyografi'}</label>
                        <textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">{'Seans Ücreti'}</label>
                        <input
                          type="number"
                          value={editForm.pricePerSession}
                          onChange={(e) => setEditForm({ ...editForm, pricePerSession: parseInt(e.target.value) || 100 })}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                        />
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isVerified}
                            onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                            className="w-4 h-4 accent-gold-500"
                          />
                          <span className="text-sm text-white">{'Onaylı'}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                            className="w-4 h-4 accent-gold-500"
                          />
                          <span className="text-sm text-white">{'Aktif'}</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={handleEdit}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-gold-500 text-deep-purple-900 rounded-lg hover:bg-gold-400 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Approve Modal */}
                {modalType === 'approve' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-gold-400 mb-4 flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      {'Başvuru Değerlendir'}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span> {'başvurusu'}
                    </p>
                    <div>
                      <label className="text-sm text-gray-400">{'Not (opsiyonel)'}</label>
                      <textarea
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        rows={2}
                        placeholder={'Onay/Red notu...'}
                        className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => handleApprove('reject')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {'Reddet'}
                      </button>
                      <button
                        onClick={() => handleApprove('approve')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Onayla'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Warning Modal */}
                {modalType === 'warning' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-orange-400 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      {'Uyarı Ver'}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span> ({'mevcut uyarı sayısı'}: {selectedTeller.warnings.length})
                    </p>
                    <div>
                      <label className="text-sm text-gray-400">{'Uyarı Sebebi'}</label>
                      <textarea
                        value={warningReason}
                        onChange={(e) => setWarningReason(e.target.value)}
                        rows={3}
                        placeholder={'Uyarı sebebini yazın...'}
                        className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500"
                      />
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={handleWarning}
                        disabled={actionLoading || !warningReason}
                        className="flex-1 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-400 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Uyarı Ver'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Ban Modal */}
                {modalType === 'ban' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-red-400 mb-4 flex items-center gap-2">
                      <Ban className="w-5 h-5" />
                      {selectedTeller.isBanned ? ('Yasağı Kaldır') : ('Yasakla')}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span>
                    </p>
                    {!selectedTeller.isBanned && (
                      <div>
                        <label className="text-sm text-gray-400">{'Yasaklama Sebebi'}</label>
                        <textarea
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          rows={3}
                          placeholder={'Yasaklama sebebini yazın...'}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500"
                        />
                      </div>
                    )}
                    {selectedTeller.isBanned && (
                      <p className="text-sm text-gray-400 mb-4">
                        {'Mevcut sebep:'} <span className="text-white">{selectedTeller.banReason}</span>
                      </p>
                    )}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={() => handleBan(selectedTeller.isBanned ? 'unban' : 'ban')}
                        disabled={actionLoading}
                        className={`flex-1 py-2 rounded-lg disabled:opacity-50 ${selectedTeller.isBanned ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-red-500 hover:bg-red-400 text-white'}`}
                      >
                        {actionLoading ? '...' : selectedTeller.isBanned ? ('Yasağı Kaldır') : ('Yasakla')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Freeze Modal */}
                {modalType === 'freeze' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-cyan-400 mb-4 flex items-center gap-2">
                      <Snowflake className="w-5 h-5" />
                      {selectedTeller.isFrozen ? ('Dondurma Kaldır') : ('Kazancı Dondur')}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span>
                    </p>
                    {!selectedTeller.isFrozen && (
                      <div>
                        <label className="text-sm text-gray-400">{'Dondurma Sebebi'}</label>
                        <textarea
                          value={freezeReason}
                          onChange={(e) => setFreezeReason(e.target.value)}
                          rows={3}
                          placeholder={'Dondurma sebebini yazın...'}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500"
                        />
                      </div>
                    )}
                    {selectedTeller.isFrozen && (
                      <p className="text-sm text-gray-400 mb-4">
                        {'Mevcut sebep:'} <span className="text-white">{selectedTeller.freezeReason}</span>
                      </p>
                    )}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={() => handleFreeze(selectedTeller.isFrozen ? 'unfreeze' : 'freeze')}
                        disabled={actionLoading}
                        className={`flex-1 py-2 rounded-lg disabled:opacity-50 ${selectedTeller.isFrozen ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-cyan-500 hover:bg-cyan-400 text-white'}`}
                      >
                        {actionLoading ? '...' : selectedTeller.isFrozen ? ('Dondurma Kaldır') : ('Dondur')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Bonus Modal */}
                {modalType === 'bonus' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-gold-400 mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      {'Bonus CFC Ver'}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span> ({'mevcut bonus'}: {selectedTeller.bonusCredits})
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400">{'Miktar'}</label>
                        <input
                          type="number"
                          value={bonusAmount}
                          onChange={(e) => setBonusAmount(parseInt(e.target.value) || 0)}
                          min={1}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">{'Sebep (opsiyonel)'}</label>
                        <input
                          type="text"
                          value={bonusReason}
                          onChange={(e) => setBonusReason(e.target.value)}
                          placeholder={'Bonus sebebi...'}
                          className="w-full mt-1 px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={handleBonus}
                        disabled={actionLoading || bonusAmount <= 0}
                        className="flex-1 py-2 bg-gold-500 text-deep-purple-900 rounded-lg hover:bg-gold-400 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Bonus Ver'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Permissions Modal */}
                {modalType === 'permissions' && selectedTeller && (
                  <div>
                    <h3 className="text-xl font-serif text-emerald-400 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      {'Falcı Yetkileri'}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      <span className="font-semibold text-white">{selectedTeller.displayName}</span>
                    </p>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {/* Boolean Permissions */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'canGoOnline', tr: 'Online Olabilir', en: 'Can Go Online' },
                          { key: 'canChat', tr: 'Sohbet Edebilir', en: 'Can Chat' },
                          { key: 'canStartSession', tr: 'Seans Başlatabilir', en: 'Can Start Session' },
                          { key: 'canSetPrice', tr: 'Fiyat Belirleyebilir', en: 'Can Set Price' },
                          { key: 'canEditProfile', tr: 'Profil Düzenleyebilir', en: 'Can Edit Profile' },
                          { key: 'canViewEarnings', tr: 'Kazançları Görebilir', en: 'Can View Earnings' },
                          { key: 'canWithdraw', tr: 'Para Çekebilir', en: 'Can Withdraw' },
                        ].map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 p-2 bg-deep-purple-800/50 rounded-lg cursor-pointer hover:bg-deep-purple-800">
                            <input
                              type="checkbox"
                              checked={permissionsForm[perm.key as keyof typeof permissionsForm] as boolean}
                              onChange={(e) => setPermissionsForm(prev => ({ ...prev, [perm.key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-purple-500 text-emerald-500 focus:ring-emerald-500 bg-deep-purple-900"
                            />
                            <span className="text-sm text-gray-300">{perm.tr}</span>
                          </label>
                        ))}
                      </div>

                      {/* Numeric Settings */}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">
                            {'Günlük Max Seans'}
                          </label>
                          <input
                            type="number"
                            value={permissionsForm.maxSessionsPerDay}
                            onChange={(e) => setPermissionsForm(prev => ({ ...prev, maxSessionsPerDay: parseInt(e.target.value) || 10 }))}
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">
                            {'Komisyon Oranı (%)'}
                          </label>
                          <input
                            type="number"
                            value={permissionsForm.commissionRate}
                            onChange={(e) => setPermissionsForm(prev => ({ ...prev, commissionRate: parseInt(e.target.value) || 20 }))}
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      {/* Admin Notes */}
                      <div className="mt-4">
                        <label className="text-sm text-gray-400 block mb-1">
                          {'Admin Notları (Falcı göremez)'}
                        </label>
                        <textarea
                          value={permissionsForm.adminNotes}
                          onChange={(e) => setPermissionsForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                          rows={2}
                          placeholder={'Özel notlar...'}
                          className="w-full px-3 py-2 bg-deep-purple-800 border border-deep-purple-600 rounded-lg text-white placeholder-gray-500 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2 bg-deep-purple-700 text-white rounded-lg hover:bg-deep-purple-600"
                      >
                        {'İptal'}
                      </button>
                      <button
                        onClick={handlePermissions}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {actionLoading ? '...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
