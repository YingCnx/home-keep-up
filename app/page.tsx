'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
    
    // 1. ดึงข้อมูลทรัพย์สิน
    const { data: assetsData } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    
    // 2. ดึงข้อมูลค่าใช้จ่าย
    const { data: logsData } = await supabase.from('maintenance_logs').select(`cost, equipments (spaces (asset_id))`)

    // 3. ดึงรายการแจ้งเตือน (Query แบบระบุชื่อตารางชัดเจน ป้องกัน Error 400)
    const today = new Date().toISOString().split('T')[0]
    const { data: upcomingData } = await supabase
      .from('maintenance_logs')
      .select(`
        id,
        detail,
        next_service_date,
        equipments (
          name,
          spaces (
            asset_id
          )
        )
      `)
      .not('next_service_date', 'is', null)
      .gte('next_service_date', today)
      .order('next_service_date', { ascending: true })
      .limit(5)

    if (assetsData) {
      const assetsWithTotal = assetsData.map(asset => {
        const total = logsData
          ?.filter(log => (log.equipments as any)?.spaces?.asset_id === asset.id)
          .reduce((sum, log) => sum + (log.cost || 0), 0)
        
        // แนบชื่อ Asset ให้กับ upcomingTasks เพื่อใช้แสดงผล
        return { ...asset, total_cost: total || 0 }
      })

      // แมพชื่อ Asset กลับไปที่ Task
      const tasksWithAssetName = upcomingData?.map(task => {
        const asset = assetsData.find(a => a.id === (task.equipments as any)?.spaces?.asset_id)
        return { ...task, asset_name: asset?.name || 'Asset' }
      })

      setAssets(assetsWithTotal)
      setUpcomingTasks(tasksWithAssetName || [])
      setTotalExpenses(assetsWithTotal.reduce((sum, asset) => sum + asset.total_cost, 0))
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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F5F3FF]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#7C3AED] font-bold text-sm">กำลังโหลด...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F7FF] text-slate-900 pb-32 font-sans shadow-2xl">
      
      {/* Header */}
      <nav className="sticky top-0 z-20 bg-[#F8F7FF] p-6 pb-4 flex justify-between items-center">
        <div>
          <p className="text-[#7C3AED] text-sm font-bold uppercase tracking-widest opacity-80">Welcome back,</p>
          <h1 className="text-2xl font-bold text-slate-800">{user?.user_metadata?.name || 'คุณภู'}</h1>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center border-2 border-purple-100 overflow-hidden active:scale-90 transition-all"
          >
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : <span className="text-xl">🤵🏻‍♂️</span>
            }
          </button>

          {showLogout && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowLogout(false)} />
              <div className="absolute right-0 top-14 z-40 bg-white rounded-2xl shadow-xl border border-purple-50 overflow-hidden w-44">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{user?.user_metadata?.name}</p>
                </div>
                <button
                  onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <span>🚪</span> ออกจากระบบ
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="px-6">
        {/* Total Spending Card - ปรับให้เล็กลง */}
        <div className="bg-[#7C3AED] rounded-[2.5rem] p-6 text-white mb-6 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-medium mb-1">ยอดบำรุงรักษาทั้งหมด</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-light text-white/50">฿</span>
              <h2 className="text-3xl font-bold tracking-tight">
                {totalExpenses.toLocaleString()}
              </h2>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Upcoming Services - ปรับการ์ดให้เล็กลง แต่อักษรใหญ่ขึ้น */}
        {upcomingTasks.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">การแจ้งเตือน</h3>
              <span className="text-[11px] font-bold text-red-500 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                Action Required
              </span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="min-w-[220px] bg-white rounded-[2rem] p-5 shadow-md border-b-4 border-[#7C3AED]">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-50 text-red-500 text-[11px] font-bold px-2 py-1 rounded-lg">
                      {new Date(task.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 uppercase truncate max-w-[80px]">
                      {(task as any).asset_name}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{task.detail}</h4>
                  <p className="text-xs text-slate-400 mt-1 italic">@{task.equipments?.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio List */}
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold text-slate-800">ทรัพย์สินของคุณ</h3>
          <Link href="/add-asset" className="text-[#7C3AED] text-xs font-bold bg-white px-4 py-2 rounded-full shadow-sm">
            + เพิ่มใหม่
          </Link>
        </div>

        <div className="space-y-4">
          {assets.map((asset) => (
            <div key={asset.id} className="relative">
              {/* ปุ่มจัดการ - ปรับให้กดง่ายขึ้น */}
              <div className="absolute bottom-4 left-[5.5rem] flex gap-2 z-20">
                <Link 
                  href={`/edit-asset/${asset.id}`} 
                  className="text-[#7C3AED] text-[11px] font-bold bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100 shadow-sm"
                >
                  แก้ไข
                </Link>
                <button 
                  onClick={(e) => handleDelete(e, asset.id, asset.name)} 
                  className="text-red-400 text-[11px] font-bold bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 shadow-sm"
                >
                  ลบ
                </button>
              </div>

              <Link href={`/asset/${asset.id}`} className="block relative z-10">
                <div className="bg-white rounded-[2.2rem] p-5 pb-12 flex items-start justify-between shadow-sm border border-white active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                      asset.type === 'home' ? 'bg-orange-50' : asset.type === 'motorcycle' ? 'bg-green-50' : 'bg-blue-50'
                    }`}>
                      {asset.type === 'home' ? '🏠' : asset.type === 'motorcycle' ? '🏍️' : '🚗'}
                    </div>
                    
                    <div className="max-w-[130px]">
                      <h4 className="font-bold text-slate-800 text-base leading-tight truncate">{asset.name}</h4>
                      <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                        {asset.asset_number || 'ไม่มีเลขทะเบียน'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] text-slate-300 font-bold uppercase mb-1">ค่าบำรุงรักษา</p>
                    <p className="font-bold text-[#7C3AED] text-lg leading-none">฿{asset.total_cost.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>


    </div>
  )
}