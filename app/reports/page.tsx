'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AssetIcon } from '../components/Icons'
import { StatsSkeleton } from '../components/Skeleton'

export default function ReportsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'monthly'|'yearly'>('monthly')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: logsData } = await supabase
      .from('maintenance_logs')
      .select('*, equipments(spaces(assets(id, name, type)))')
      .order('service_date', { ascending: true })
    const { data: assetsData } = await supabase.from('assets').select('*')
    setLogs(logsData || [])
    setAssets(assetsData || [])
    setLoading(false)
  }

  // สรุปค่าใช้จ่ายรายเดือน
  const monthlyData = () => {
    const map: Record<string, number> = {}
    logs.forEach(log => {
      const d = new Date(log.service_date)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      map[key] = (map[key] || 0) + (log.cost || 0)
    })
    return Object.entries(map).slice(-6).map(([key, value]) => ({
      label: key.slice(5) + '/' + key.slice(2,4),
      value
    }))
  }

  // สรุปค่าใช้จ่ายรายปี
  const yearlyData = () => {
    const map: Record<string, number> = {}
    logs.forEach(log => {
      const key = new Date(log.service_date).getFullYear().toString()
      map[key] = (map[key] || 0) + (log.cost || 0)
    })
    return Object.entries(map).map(([key, value]) => ({ label: key, value }))
  }

  // ค่าใช้จ่ายแยกตาม asset
  const assetData = assets.map(asset => {
    const total = logs
      .filter(log => log.equipments?.spaces?.assets?.id === asset.id)
      .reduce((sum, log) => sum + (log.cost || 0), 0)
    return { name: asset.name, type: asset.type, vehicle_type: asset.vehicle_type, total }
  }).sort((a, b) => b.total - a.total)

  const chartData = period === 'monthly' ? monthlyData() : yearlyData()
  const totalSpent = logs.reduce((sum, l) => sum + (l.cost || 0), 0)

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">
      <div className="h-14 bg-blue-600 mb-5" />
      <div className="px-5 space-y-4">
        <div className="h-20 bg-white rounded-3xl animate-pulse border border-slate-100" />
        <div className="h-52 bg-white rounded-3xl animate-pulse border border-slate-100" />
        <StatsSkeleton />
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="การเงิน" />

      <div className="px-5 pt-5 space-y-4">

        {/* Total Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-slate-400 text-xs font-medium mb-1">ค่าบำรุงรักษารวมทั้งหมด</p>
          <p className="text-3xl font-bold text-slate-800">฿{totalSpent.toLocaleString()}</p>
          <p className="text-slate-400 text-xs mt-1">{logs.length} รายการทั้งหมด</p>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-800 font-bold text-sm">ค่าใช้จ่าย</p>
            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
              <button onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${period === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                รายเดือน
              </button>
              <button onClick={() => setPeriod('yearly')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${period === 'yearly' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                รายปี
              </button>
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={45}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v: any) => [`฿${v.toLocaleString()}`, 'ค่าใช้จ่าย']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="value" fill="#2563EB" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล</div>
          )}
        </div>

        {/* Per Asset */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <p className="text-slate-800 font-bold text-sm mb-4">แยกตามทรัพย์สิน</p>
          <div className="space-y-3">
            {assetData.map((asset, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${asset.type === 'home' ? 'bg-orange-50 text-orange-500' : asset.vehicle_type === 'มอเตอร์ไซค์' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <AssetIcon type={asset.type} vehicleType={asset.vehicle_type} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <p className="text-slate-800 font-bold text-sm truncate">{asset.name}</p>
                    <p className="text-blue-600 font-bold text-sm">฿{asset.total.toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${totalSpent > 0 ? (asset.total / totalSpent) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {assetData.length === 0 && <p className="text-center text-slate-400 text-sm py-4">ยังไม่มีข้อมูล</p>}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
