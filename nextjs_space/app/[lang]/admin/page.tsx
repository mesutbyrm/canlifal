'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/lib/language-context'
import { Users, Sparkles, TrendingUp, Coffee, Star, Moon, Plus } from 'lucide-react'
import LoadingSpinner from '@/components/loading-spinner'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  name: string
  credits: number
  role: string
  preferredLanguage: string
  createdAt: string
  _count: {
    fortunes: number
  }
}

interface Statistics {
  totalUsers: number
  totalFortunes: number
  fortunesByType: Record<string, number>
}

export default function AdminPage() {
  const { language, t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/statistics'),
      ])
      
      const usersData = await usersRes.json()
      const statsData = await statsRes.json()
      
      setUsers(usersData?.users || [])
      setStatistics(statsData)
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addCredits = async (userId: string, amount: number) => {
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      })

      if (response?.ok) {
        // Refresh data
        await fetchData()
        setSelectedUser(null)
        alert(language === 'tr' ? 'Kredi eklendi!' : 'Credits added!')
      } else {
        alert(language === 'tr' ? 'Kredi eklenemedi!' : 'Failed to add credits!')
      }
    } catch (error) {
      console.error('Failed to add credits:', error)
      alert(language === 'tr' ? 'Hata oluştu!' : 'Error occurred!')
    }
  }

  return (
    <div className="min-h-screen py-20 px-4 bg-gradient-to-b from-[#0a0118] to-deep-purple-975">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl text-gold-500 gold-glow mb-4">
            {t('nav.admin')}
          </h1>
        </motion.div>

        {isLoading ? (
          <LoadingSpinner message={language === 'tr' ? 'Veriler yükleniyor...' : 'Loading data...'} />
        ) : (
          <>
            {/* Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid md:grid-cols-3 gap-6 mb-12"
            >
              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-gold-500" />
                  <h3 className="text-deep-purple-200 font-medium">{t('admin.total_users')}</h3>
                </div>
                <p className="text-4xl font-serif text-gold-400">{statistics?.totalUsers ?? 0}</p>
              </div>

              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-6 h-6 text-gold-500" />
                  <h3 className="text-deep-purple-200 font-medium">{t('admin.total_fortunes')}</h3>
                </div>
                <p className="text-4xl font-serif text-gold-400">{statistics?.totalFortunes ?? 0}</p>
              </div>

              <div className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow">
                <h3 className="text-deep-purple-200 font-medium mb-3">{language === 'tr' ? 'Fal Türleri' : 'Fortune Types'}</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{t('fortune.coffee.name')}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.coffee ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{t('fortune.tarot.name')}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.tarot ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-gold-500" />
                      <span className="text-deep-purple-200">{t('fortune.dream.name')}</span>
                    </div>
                    <span className="text-gold-400 font-medium">{statistics?.fortunesByType?.dream ?? 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Users Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-mystical-card border border-mystical rounded-lg p-6 mystical-shadow overflow-x-auto"
            >
              <h2 className="font-serif text-2xl text-gold-400 mb-6">{t('admin.users')}</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-deep-purple-800">
                    <th className="text-left py-3 px-4 text-deep-purple-300 font-medium">{t('form.name')}</th>
                    <th className="text-left py-3 px-4 text-deep-purple-300 font-medium">{t('form.email')}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{t('nav.credits')}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Fal Sayısı' : 'Fortunes'}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Kayıt' : 'Joined'}</th>
                    <th className="text-center py-3 px-4 text-deep-purple-300 font-medium">{language === 'tr' ? 'Açıklar' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user?.id} className="border-b border-deep-purple-900/50 hover:bg-deep-purple-900/20">
                      <td className="py-3 px-4 text-deep-purple-100">{user?.name}</td>
                      <td className="py-3 px-4 text-deep-purple-100">{user?.email}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gold-400 font-medium">
                          <Sparkles className="w-4 h-4" />
                          {user?.credits}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-deep-purple-100">{user?._count?.fortunes ?? 0}</td>
                      <td className="py-3 px-4 text-center text-deep-purple-300 text-sm">
                        {format(new Date(user?.createdAt), 'MMM dd')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-gold-600/20 text-gold-400 rounded hover:bg-gold-600/30 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          {language === 'tr' ? 'Kredi Ekle' : 'Add Credits'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </>
        )}

        {/* Add Credits Modal */}
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedUser(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-mystical-card border border-mystical rounded-lg p-8 max-w-md w-full mystical-shadow"
            >
              <h3 className="font-serif text-2xl text-gold-400 mb-6">
                {t('admin.add_credits')}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-deep-purple-300 text-sm mb-1">{t('form.name')}</p>
                  <p className="text-deep-purple-100 font-medium">{selectedUser?.name}</p>
                </div>
                <div>
                  <p className="text-deep-purple-300 text-sm mb-1">{language === 'tr' ? 'Mevcut Kredi' : 'Current Credits'}</p>
                  <p className="text-gold-400 font-semibold text-xl">{selectedUser?.credits}</p>
                </div>

                <div>
                  <label className="text-deep-purple-300 text-sm mb-2 block">
                    {language === 'tr' ? 'Eklenecek Kredi' : 'Credits to Add'}
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e?.target?.value ?? '0'))}
                    min="1"
                    className="w-full px-4 py-3 bg-deep-purple-900/50 border border-deep-purple-700 rounded-lg text-deep-purple-100 focus:outline-none focus:border-gold-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-3 bg-deep-purple-800 text-deep-purple-200 rounded-lg hover:bg-deep-purple-700 transition-all duration-300 font-medium"
                >
                  {t('form.cancel')}
                </button>
                <button
                  onClick={() => addCredits(selectedUser?.id, creditAmount)}
                  className="flex-1 py-3 bg-gold-600 text-deep-purple-950 rounded-lg hover:bg-gold-500 transition-all duration-300 font-semibold mystical-shadow"
                >
                  {language === 'tr' ? 'Ekle' : 'Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
