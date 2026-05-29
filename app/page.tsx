'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BottomNav from './components/BottomNav'

export default function Dashboard() {
  const router = useRouter()
  const [assets, setAssets] = useState<any[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: assetsData } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    const { data: logsData } = await supabase.from('maintenance_logs').select(`cost, equipments (spaces (asset_id))`)
    const today = new Date().toISOString().split('T')[0]
    const { data: upcomingData } = await supabase
      .from('maintenance_logs')
      .select(`id, detail, next_service_date, equipments (name, spaces (asset_id))`)
      .not('next_service_date', 'is', null)
      .gte('next_service_date', today)
      .order('next_service_date', { ascending: true })
      .limit(5)

    if (assetsData) {
      const assetsWithTotal = assetsData.map(asset => {
        const total = logsData?.filter(log => (log.equipments as any)?.spaces?.asset_id === asset.id)
          .reduce((sum, log) => sum + (log.cost || 0), 0)
        return { ...asset, total_cost: total || 0 }
      })
      const tasksWithAssetName = upcomingData?.map(task => {
        const asset = assetsData.find(a => a.id === (task.equipments as any)?.spaces?.asset_id)
        return { ...task, asset_name: asset?.name || 'Asset' }
      })
      setAssets(assetsWithTotal)
      setUpcomingTasks(tasksWithAssetName || [])
      setTotalExpenses(assetsWithTotal.reduce((sum, a) => sum + a.total_cost, 0))
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    if (!confirm(`ยืนยันการลบ "${name}"?`)) return
    await supabase.from('assets').delete().eq('id', id)
    fetchData()
  }

  const getDaysLeft = (dateStr: string) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const target = new Date(dateStr); target.setHours(0,0,0,0)
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-600 font-bold text-sm">Loading...</p>
      </div>
    </div>
  )

  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'คุณ'

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      {/* Header */}
      <div className="bg-blue-600 px-6 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500 rounded-full opacity-50" />
        <div className="absolute right-10 top-16 w-20 h-20 bg-blue-400 rounded-full opacity-40" />

        <div className="relative z-10 flex justify-between items-start mb-8">
          <div>
            <p className="text-blue-200 text-sm font-medium">Hello,</p>
            <h1 className="text-white text-2xl font-bold">{firstName} 👋</h1>
          </div>
          <div className="relative">
            <button onClick={() => setShowLogout(!showLogout)} className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white/30 active:scale-90 transition-all">
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                : <div className="w-full h-full bg-blue-400 flex items-center justify-center text-white font-bold">{firstName[0]}</div>
              }
            </button>
            {showLogout && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowLogout(false)} />
                <div className="absolute right-0 top-13 z-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-44 mt-2">
                  <div className="px-4 py-3 border-b border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{user?.user_metadata?.name}</p>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                    <span>🚪</span> ออกจากระบบ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Overview Card */}
        <div className="relative z-10 bg-white rounded-3xl p-5 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs font-medium">ค่าบำรุงรักษาทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">฿{totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 px-3 py-1.5 rounded-xl">
              <p className="text-blue-600 text-xs font-bold">{assets.length} Assets</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-slate-800">{upcomingTasks.length}</p>
              <p className="text-[10px] text-slate-400 font-medium">Upcoming</p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-amber-600">{upcomingTasks.filter(t => getDaysLeft(t.next_service_date) <= 7).length}</p>
              <p className="text-[10px] text-amber-400 font-medium">Due Soon</p>
            </div>
            <div className="flex-1 bg-green-50 rounded-2xl p-3 text-center">
              <p className="text-lg font-bold text-green-600">{assets.length}</p>
              <p className="text-[10px] text-green-400 font-medium">Properties</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">

        {/* Upcoming Maintenance */}
        {upcomingTasks.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-slate-800 font-bold text-base">Upcoming Maintenance</h2>
              <Link href="/reminders" className="text-blue-600 text-xs font-bold">See all</Link>
            </div>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map(task => {
                const days = getDaysLeft(task.next_service_date)
                return (
                  <div key={task.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-100">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${days <= 3 ? 'bg-red-50' : days <= 7 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      <span className="text-lg">{days <= 3 ? '🔴' : days <= 7 ? '🟡' : '🔵'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-bold text-sm truncate">{task.detail}</p>
                      <p className="text-slate-400 text-xs">{task.asset_name} · @{task.equipments?.name}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 ${days <= 3 ? 'bg-red-50 text-red-500' : days <= 7 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-500'}`}>
                      {days === 0 ? 'วันนี้' : `${days}d`}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* My Properties */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-slate-800 font-bold text-base">My Properties</h2>
          <Link href="/add-asset" className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full">+ Add new</Link>
        </div>

        <div className="space-y-3">
          {assets.map(asset => (
            <div key={asset.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <Link href={`/asset/${asset.id}`} className="block">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                    {asset.image_url
                      ? <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
                      : <div className={`w-full h-full flex items-center justify-center text-2xl ${asset.type === 'home' ? 'bg-orange-50' : asset.type === 'motorcycle' ? 'bg-green-50' : 'bg-blue-50'}`}>
                          {asset.type === 'home' ? '🏠' : asset.type === 'motorcycle' ? '🏍️' : '🚗'}
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-slate-800 font-bold text-base truncate">{asset.name}</h3>
                    </div>
                    <p className="text-slate-400 text-xs font-medium">{asset.asset_number || 'ไม่มีเลขทะเบียน'}</p>
                    <p className="text-blue-600 font-bold text-sm mt-1">฿{asset.total_cost.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${asset.type === 'home' ? 'bg-orange-50 text-orange-500' : asset.type === 'motorcycle' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {asset.type === 'home' ? 'Property' : asset.type === 'motorcycle' ? 'Motorcycle' : 'Car'}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              </Link>
              <div className="flex border-t border-slate-50">
                <Link href={`/edit-asset/${asset.id}`} className="flex-1 py-3 text-center text-blue-600 text-xs font-bold border-r border-slate-50 active:bg-slate-50">
                  แก้ไข
                </Link>
                <button onClick={(e) => handleDelete(e, asset.id, asset.name)} className="flex-1 py-3 text-center text-red-400 text-xs font-bold active:bg-slate-50">
                  ลบ
                </button>
              </div>
            </div>
          ))}

          {assets.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-4xl mb-3">🏠</p>
              <p className="text-slate-400 font-bold">ยังไม่มีทรัพย์สิน</p>
              <Link href="/add-asset" className="inline-block mt-4 bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-full">
                + เพิ่มทรัพย์สิน
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
