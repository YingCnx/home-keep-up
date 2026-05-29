'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // ปิด dropdown เมื่อคลิกนอก
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: assetsData } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    const { data: logsData } = await supabase.from('maintenance_logs').select(`cost, equipments (spaces (asset_id))`)
    const today = new Date().toISOString().split('T')[0]
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: overdueData } = await supabase
      .from('maintenance_logs')
      .select(`id, detail, next_service_date, equipments (name, spaces (asset_id, assets(name, type, image_url)))`)
      .not('next_service_date', 'is', null)
      .lt('next_service_date', today)

    const { data: urgentData } = await supabase
      .from('maintenance_logs')
      .select(`id, detail, next_service_date, equipments (name, spaces (asset_id, assets(name, type, image_url)))`)
      .not('next_service_date', 'is', null)
      .gte('next_service_date', today)
      .lte('next_service_date', in7days)

    const upcomingData = [...(overdueData || []), ...(urgentData || [])]

    if (assetsData) {
      const assetsWithTotal = assetsData.map(asset => {
        const total = logsData?.filter(log => (log.equipments as any)?.spaces?.asset_id === asset.id)
          .reduce((sum, log) => sum + (log.cost || 0), 0)
        return { ...asset, total_cost: total || 0 }
      })
      const tasksWithAssetName = upcomingData?.map(task => {
        const asset = assetsData.find(a => a.id === (task.equipments as any)?.spaces?.asset_id)
        const isOverdue = task.next_service_date < today
        return { ...task, asset_name: asset?.name || 'Asset', asset_image: asset?.image_url || null, asset_type: asset?.type, isOverdue }
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
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const firstName = user?.user_metadata?.name?.split(' ')[0] || 'คุณ'
  const overdueCount = upcomingTasks.filter(t => t.isOverdue).length
  const dueSoon = upcomingTasks.filter(t => !t.isOverdue).length

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-24">

      {/* Top Bar */}
      <div className="flex justify-between items-center px-5 pt-12 pb-4">
        <img src="/logo.png" alt="Home Keep Up" className="w-20 h-20 object-contain" />
        <div className="flex items-center gap-3">

          {/* Bell + Dropdown */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotif(v => !v)}
              className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 active:bg-slate-100 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </button>
            {upcomingTasks.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center pointer-events-none ${overdueCount > 0 ? 'bg-red-500' : 'bg-amber-400'}`}>
                {upcomingTasks.length}
              </span>
            )}

            {/* Dropdown Panel */}
            {showNotif && (
              <div className="absolute right-0 top-13 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden mt-2">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                  <p className="font-bold text-slate-800 text-sm">การแจ้งเตือน</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${overdueCount > 0 ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                    {upcomingTasks.length} รายการ
                  </span>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {upcomingTasks.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-slate-400 text-sm font-medium">ไม่มีรายการแจ้งเตือน</p>
                    </div>
                  ) : (
                    upcomingTasks.map(task => {
                      const days = getDaysLeft(task.next_service_date)
                      const isOverdue = task.isOverdue
                      const assetEmoji = task.asset_type === 'home' ? '🏠' : task.asset_type === 'motorcycle' ? '🏍️' : '🚗'
                      return (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                            {task.asset_image
                              ? <img src={task.asset_image} className="w-full h-full object-cover" alt="" />
                              : <div className={`w-full h-full flex items-center justify-center text-base ${isOverdue ? 'bg-red-50' : 'bg-amber-50'}`}>{assetEmoji}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-800 font-bold text-xs truncate">{task.detail}</p>
                            <p className="text-slate-400 text-[10px]">{task.asset_name} · {task.equipments?.name}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${isOverdue ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                            {isOverdue ? `เลย ${Math.abs(days)}d` : days === 0 ? 'วันนี้!' : `${days}d`}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                {upcomingTasks.length > 0 && (
                  <div className="border-t border-slate-50 p-3">
                    <Link href="/reminders" onClick={() => setShowNotif(false)}
                      className="block w-full py-2.5 text-center text-blue-600 font-bold text-xs bg-blue-50 rounded-xl active:scale-95 transition-all">
                      ดูทั้งหมดและจัดการ →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link href="/profile">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-slate-100">
              {user?.user_metadata?.avatar_url
                ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">{firstName[0]}</div>
              }
            </div>
          </Link>
        </div>
      </div>

      <div className="px-5">
        <p className="text-slate-500 text-base mb-0.5">Hello,</p>
        <h1 className="text-slate-900 text-2xl font-bold mb-5">{firstName}! 👋</h1>

        {/* Banner Card */}
        <div className="bg-blue-600 rounded-3xl p-5 mb-5 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-500 rounded-full opacity-60" />
          <div className="absolute right-4 top-4 w-16 h-16 bg-blue-400 rounded-full opacity-40" />
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-3">ทรัพย์สินของคุณ</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-white text-3xl font-bold">{assets.length}</p>
                  <p className="text-blue-200 text-xs mt-0.5">ทั้งหมด</p>
                </div>
                <div>
                  <p className="text-white text-3xl font-bold">{upcomingTasks.length}</p>
                  <p className="text-blue-200 text-xs mt-0.5">ใกล้ถึงกำหนด</p>
                </div>
              </div>
            </div>
            <Link href="/add-asset">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Overview Grid */}
        <h2 className="text-slate-800 font-bold text-base mb-3">Overview</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/reminders">
            <div className="bg-amber-400 rounded-2xl p-4 relative overflow-hidden active:scale-95 transition-all">
              <div className="absolute -right-3 -bottom-3 w-14 h-14 bg-amber-300 rounded-full opacity-50" />
              <div className="flex justify-between items-start mb-3">
                <p className="text-white font-bold text-sm">บำรุงรักษา</p>
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
              <p className="text-white/80 text-xs">คุณมี <span className="text-white font-bold">{upcomingTasks.length}</span> รายการที่รอดำเนินการ</p>
            </div>
          </Link>

          <Link href="/reports">
            <div className="bg-blue-600 rounded-2xl p-4 relative overflow-hidden active:scale-95 transition-all">
              <div className="absolute -right-3 -bottom-3 w-14 h-14 bg-blue-500 rounded-full opacity-50" />
              <div className="flex justify-between items-start mb-3">
                <p className="text-white font-bold text-sm">ค่าใช้จ่าย</p>
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
              <p className="text-white font-bold text-lg">฿{totalExpenses >= 1000 ? (totalExpenses/1000).toFixed(1)+'k' : totalExpenses.toLocaleString()}</p>
            </div>
          </Link>

          <Link href="/">
            <div className="bg-blue-50 rounded-2xl p-4 relative overflow-hidden active:scale-95 transition-all border border-blue-100">
              <div className="flex justify-between items-start mb-3">
                <p className="text-blue-700 font-bold text-sm">ทรัพย์สิน</p>
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
              <p className="text-blue-500 text-xs">คุณมี <span className="text-blue-700 font-bold">{assets.length}</span> ทรัพย์สิน</p>
            </div>
          </Link>

          <Link href="/reminders">
            <div className="bg-amber-50 rounded-2xl p-4 relative overflow-hidden active:scale-95 transition-all border border-amber-100">
              <div className="flex justify-between items-start mb-3">
                <p className="text-amber-700 font-bold text-sm">ด่วน</p>
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
              <p className="text-amber-500 text-xs">คุณมี <span className="text-amber-700 font-bold">{overdueCount}</span> รายการเลยกำหนด</p>
            </div>
          </Link>
        </div>

        {/* Properties List */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-slate-800 font-bold text-base">ทรัพย์สินทั้งหมด</h2>
          <Link href="/add-asset" className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-full">+ เพิ่มใหม่</Link>
        </div>

        <div className="space-y-3">
          {assets.map(asset => (
            <div key={asset.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <Link href={`/asset/${asset.id}`} className="block">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                    {asset.image_url
                      ? <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
                      : <div className={`w-full h-full flex items-center justify-center text-2xl ${asset.type === 'home' ? 'bg-orange-50' : asset.type === 'motorcycle' ? 'bg-green-50' : 'bg-blue-50'}`}>
                          {asset.type === 'home' ? '🏠' : asset.type === 'motorcycle' ? '🏍️' : '🚗'}
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-800 font-bold text-base truncate">{asset.name}</h3>
                    <p className="text-slate-400 text-xs">{asset.asset_number || 'ไม่มีเลขทะเบียน'}</p>
                    <p className="text-blue-600 font-bold text-sm mt-1">฿{asset.total_cost.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${asset.type === 'home' ? 'bg-orange-50 text-orange-500' : asset.type === 'motorcycle' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {asset.type === 'home' ? 'Property' : asset.type === 'motorcycle' ? 'Motorcycle' : 'Car'}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </Link>
              <div className="flex border-t border-slate-50">
                <Link href={`/edit-asset/${asset.id}`} className="flex-1 py-2.5 text-center text-blue-600 text-xs font-bold border-r border-slate-50 active:bg-slate-50">แก้ไข</Link>
                <button onClick={(e) => handleDelete(e, asset.id, asset.name)} className="flex-1 py-2.5 text-center text-red-400 text-xs font-bold active:bg-slate-50">ลบ</button>
              </div>
            </div>
          ))}

          {assets.length === 0 && (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <p className="text-4xl mb-3">🏠</p>
              <p className="text-slate-400 font-medium mb-4">ยังไม่มีทรัพย์สิน</p>
              <Link href="/add-asset" className="inline-block bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-full">+ เพิ่มทรัพย์สิน</Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
