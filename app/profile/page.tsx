'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({ assets: 0, logs: 0, total: 0 })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: assets } = await supabase.from('assets').select('id')
    const { data: logs } = await supabase
      .from('maintenance_logs')
      .select('cost, equipments(spaces(assets(user_id)))')
    const total = logs?.reduce((sum, l) => sum + (l.cost || 0), 0) || 0
    setStats({ assets: assets?.length || 0, logs: logs?.length || 0, total })
  }

  const handleLogout = async () => {
    if (!confirm('ยืนยันการออกจากระบบ?')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      {/* Header */}
      <div className="bg-blue-600 px-6 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500 rounded-full opacity-50" />
        <h1 className="text-white text-2xl font-bold relative z-10">Profile</h1>
      </div>

      <div className="px-5 -mt-10">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-blue-100">
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-blue-600">
                  {user?.user_metadata?.name?.[0] || '?'}
                </div>
            }
          </div>
          <div>
            <p className="text-slate-800 font-bold text-lg">{user?.user_metadata?.name || '-'}</p>
            <p className="text-slate-400 text-sm">{user?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{stats.assets}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Assets</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{stats.logs}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Records</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-lg font-bold text-blue-600">฿{(stats.total/1000).toFixed(0)}k</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total</p>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Account</p>
          </div>
          <button onClick={handleLogout}
            className="w-full px-5 py-4 flex items-center gap-3 text-red-500 active:bg-red-50 transition-colors">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-base">🚪</div>
            <span className="font-bold text-sm">ออกจากระบบ</span>
          </button>
        </div>

        <p className="text-center text-slate-300 text-xs font-medium">Home Keep Up v1.0</p>
      </div>

      <BottomNav />
    </div>
  )
}
