'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { useFeedback } from '../components/Feedback'
import { AssetIcon, BellIcon, CheckCircleIcon, InboxIcon, ClockIcon } from '../components/Icons'
import { StatsSkeleton, ReminderCardSkeleton } from '../components/Skeleton'

function getDaysLeft(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function RemindersPage() {
  const { toast } = useFeedback()
  const [tasks, setTasks] = useState<any[]>([])
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState<'default'|'granted'|'denied'>('default')
  const [filter, setFilter] = useState<'all'|'urgent'|'overdue'>('all')
  const [activeTab, setActiveTab] = useState<'reminders'|'history'>('reminders')
  const [assetFilter, setAssetFilter] = useState<string>('all')

  // Modal state
  const [logModal, setLogModal] = useState<any>(null) // task ที่กำลังบันทึก
  const [logDetail, setLogDetail] = useState('')
  const [logCost, setLogCost] = useState('')
  const [logBrand, setLogBrand] = useState('')
  const [logNextDate, setLogNextDate] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if ('Notification' in window) setNotifStatus(Notification.permission as any)
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: remindersData } = await supabase
      .from('maintenance_logs')
      .select('*, equipments(id, name, brand, spaces(name, assets(name, type, vehicle_type, image_url)))')
      .not('next_service_date', 'is', null)
      .order('next_service_date', { ascending: true })

    const { data: logsData } = await supabase
      .from('maintenance_logs')
      .select('*, equipments(name, spaces(name, assets(id, name, type, vehicle_type, image_url)))')
      .order('service_date', { ascending: false })


    setTasks(remindersData || [])
    setAllLogs(logsData || [])
    setLoading(false)
  }

  const requestNotification = async () => {
    if (!('Notification' in window)) return toast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน', 'error')
    const permission = await Notification.requestPermission()
    setNotifStatus(permission as any)
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js')
      new Notification('KuBaan 🏠', { body: 'เปิดการแจ้งเตือนสำเร็จแล้ว!' })
    }
  }

  // 📋 เปิด modal บันทึกการซ่อม
  const openLogModal = (task: any) => {
    setLogModal(task)
    setLogDetail(task.detail || '')
    setLogBrand(task.equipments?.brand || '')
    setLogCost('')
    setLogNextDate('')
    setLogDate(new Date().toISOString().split('T')[0])
  }

  const closeLogModal = () => {
    setLogModal(null)
    setLogDetail(''); setLogCost(''); setLogBrand(''); setLogNextDate('')
  }

  // 📋 บันทึกการซ่อม — สร้าง log ใหม่ + ล้าง next_service_date เก่า
  const handleSaveLog = async () => {
    if (!logDetail) return toast('กรุณาระบุรายละเอียด', 'error')
    setSaving(true)

    // สร้าง log ใหม่
    await supabase.from('maintenance_logs').insert([{
      equipment_id: logModal.equipments?.id,
      detail: logDetail,
      brand: logBrand || null,
      cost: parseFloat(logCost) || 0,
      service_date: logDate,
      next_service_date: logNextDate || null,
    }])

    // ล้าง next_service_date ของ log เก่า
    await supabase.from('maintenance_logs').update({ next_service_date: null }).eq('id', logModal.id)

    await fetchData()
    setSaving(false)
    closeLogModal()
    toast('บันทึกการซ่อมแล้ว', 'success')
  }

  const filtered = tasks.filter(task => {
    const days = getDaysLeft(task.next_service_date)
    if (filter === 'overdue') return days < 0
    if (filter === 'urgent') return days >= 0 && days <= 7
    return true
  })

  const overdue = tasks.filter(t => getDaysLeft(t.next_service_date) < 0).length
  const urgent = tasks.filter(t => { const d = getDaysLeft(t.next_service_date); return d >= 0 && d <= 7 }).length

  // รายการทรัพย์สินที่มีประวัติ (ไม่ซ้ำ) สำหรับใช้เป็นตัวกรอง
  const historyAssets = Array.from(
    new Map(
      allLogs
        .map(l => l.equipments?.spaces?.assets)
        .filter(a => a?.id)
        .map(a => [a.id, a])
    ).values()
  )
  const filteredLogs = assetFilter === 'all'
    ? allLogs
    : allLogs.filter(l => l.equipments?.spaces?.assets?.id === assetFilter)
  const totalCost = filteredLogs.reduce((sum, log) => sum + (log.cost || 0), 0)

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all font-medium text-slate-700 text-sm"
  const labelClass = "text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block"

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">
      <div className="h-14 bg-[#1B2F5E]" />
      <div className="px-5 pt-5">
        <div className="flex gap-2 mb-5">
          <div className="flex-1 h-9 bg-slate-200 rounded-xl animate-pulse" />
          <div className="flex-1 h-9 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <StatsSkeleton />
        <div className="space-y-3">
          <ReminderCardSkeleton />
          <ReminderCardSkeleton />
          <ReminderCardSkeleton />
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="บำรุงรักษา" showBack={false} />

      <div className="px-5 pt-5">

        {/* Tab Selector */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'reminders' ? 'bg-[#1B2F5E] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            แจ้งเตือน
          </button>
          <button onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history' ? 'bg-[#1B2F5E] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            ประวัติทั้งหมด
          </button>
        </div>

        {/* ---- TAB: REMINDERS ---- */}
        {activeTab === 'reminders' && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
                <p className="text-2xl font-bold text-slate-800">{tasks.length}</p>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">ทั้งหมด</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-red-500">{overdue}</p>
                <p className="text-[10px] font-medium text-red-400 mt-0.5">เลยกำหนด</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-amber-500">{urgent}</p>
                <p className="text-[10px] font-medium text-amber-400 mt-0.5">ด่วน 7 วัน</p>
              </div>
            </div>

            {notifStatus === 'default' && (
              <button onClick={requestNotification}
                className="w-full mb-5 bg-[#1B2F5E] text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-all">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"><BellIcon className="w-5 h-5" /></div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm">เปิดการแจ้งเตือน</p>
                  <p className="text-[#A7EDE5] text-[11px]">รับแจ้งเตือนเมื่อใกล้ถึงกำหนด</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
            {notifStatus === 'granted' && (
              <div className="w-full mb-5 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-green-700 font-bold text-sm">เปิดการแจ้งเตือนแล้ว</p>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              {[{key:'all',label:'ทั้งหมด'},{key:'overdue',label:'เลยกำหนด'},{key:'urgent',label:'ด่วน'}].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key as any)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${filter === tab.key ? 'bg-[#1B2F5E] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map(task => {
                const days = getDaysLeft(task.next_service_date)
                const isOverdue = days < 0
                const isUrgent = days >= 0 && days <= 7
                const asset = task.equipments?.spaces?.assets
                return (
                  <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    {/* Info Row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden border ${isOverdue ? 'border-red-100' : isUrgent ? 'border-amber-100' : 'border-[#B2EDE8]'}`}>
                        {asset?.image_url
                          ? <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
                          : <div className={`w-full h-full flex items-center justify-center ${isOverdue ? 'bg-red-50 text-red-400' : isUrgent ? 'bg-amber-50 text-amber-500' : 'bg-[#E6F9F7] text-blue-500'}`}><AssetIcon type={asset?.type} vehicleType={asset?.vehicle_type} className="w-5 h-5" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium mb-0.5">{asset?.name} · {task.equipments?.spaces?.name}</p>
                        <p className="text-slate-800 font-bold text-sm">{task.detail}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">@ {task.equipments?.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${isOverdue ? 'bg-red-50 text-red-500' : isUrgent ? 'bg-amber-50 text-amber-500' : 'bg-[#E6F9F7] text-blue-500'}`}>
                          {isOverdue ? `เลย ${Math.abs(days)}d` : days === 0 ? 'วันนี้!' : `${days}d`}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {new Date(task.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-50">
                      <button onClick={() => openLogModal(task)}
                        className="w-full py-2 rounded-xl bg-[#1B2F5E] text-white font-bold text-xs active:scale-95 transition-all shadow-sm">
                        บันทึกการซ่อม
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                  <CheckCircleIcon className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-400 font-bold">ไม่มีรายการที่ต้องดูแล</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---- TAB: HISTORY ---- */}
        {activeTab === 'history' && (
          <>
            {/* Asset filter */}
            {historyAssets.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button onClick={() => setAssetFilter('all')}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all ${assetFilter === 'all' ? 'bg-[#1B2F5E] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  ทั้งหมด
                </button>
                {historyAssets.map(a => (
                  <button key={a.id} onClick={() => setAssetFilter(a.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${assetFilter === a.id ? 'bg-[#1B2F5E] text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                    <AssetIcon type={a.type} vehicleType={a.vehicle_type} className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{a.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <p className="text-slate-500 text-sm font-medium">{filteredLogs.length} รายการ</p>
              <p className="text-[#2ABFAB] font-bold text-sm">฿{totalCost.toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              {filteredLogs.map(log => {
                const asset = log.equipments?.spaces?.assets
                return (
                  <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      {asset?.image_url
                        ? <img src={asset.image_url} className="w-6 h-6 rounded-lg object-cover flex-shrink-0" alt={asset.name} />
                        : <AssetIcon type={asset?.type} vehicleType={asset?.vehicle_type} className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      }
                      <span className="bg-[#E6F9F7] text-[#2ABFAB] text-[10px] font-bold px-2.5 py-1 rounded-lg">{asset?.name}</span>
                      <span className="text-slate-300 text-xs">›</span>
                      <span className="text-slate-500 text-[11px] font-medium">{log.equipments?.spaces?.name}</span>
                      <span className="text-slate-300 text-xs">›</span>
                      <span className="text-slate-500 text-[11px]">{log.equipments?.name}</span>
                    </div>
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-slate-800 font-bold text-sm flex-1 pr-3">{log.detail}</p>
                      <p className="text-[#2ABFAB] font-bold text-sm">฿{(log.cost || 0).toLocaleString()}</p>
                    </div>
                    {log.image_url && (
                      <a href={log.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2 relative">
                        <img src={log.image_url} alt="receipt" className="w-full h-32 object-cover rounded-2xl border border-slate-100" />
                        <span className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-lg">ดูรูปเต็ม</span>
                      </a>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-400 text-[11px]">{new Date(log.service_date).toLocaleDateString('th-TH')}</p>
                        {log.brand && (
                          <span className="bg-[#E6F9F7] text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#B2EDE8]">{log.brand}</span>
                        )}
                      </div>
                      {log.next_service_date && (
                        <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                          <ClockIcon className="w-3 h-3 text-amber-500" />
                          <p className="text-amber-500 text-[11px] font-bold">
                            ครั้งต่อไป: {new Date(log.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredLogs.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
                  <InboxIcon className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-400 font-bold">{allLogs.length === 0 ? 'ยังไม่มีประวัติการบำรุงรักษา' : 'ไม่มีประวัติของรายการนี้'}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: บันทึกการซ่อม */}
      {logModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-slate-800 font-bold text-lg mb-1">บันทึกการซ่อม</h3>
            <p className="text-slate-400 text-xs mb-5">@ {logModal.equipments?.name} · {logModal.equipments?.spaces?.name}</p>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>รายละเอียด</label>
                <input className={inputClass} value={logDetail} onChange={e => setLogDetail(e.target.value)}
                  placeholder="เช่น เปลี่ยนน้ำมันเครื่อง" autoFocus />
              </div>
              <div>
                <label className={labelClass}>ยี่ห้อ / รุ่น <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                <input className={inputClass} value={logBrand} onChange={e => setLogBrand(e.target.value)}
                  placeholder={logModal.equipments?.brand || 'ยี่ห้อ/รุ่น'} />
              </div>
              <div>
                <label className={labelClass}>ค่าใช้จ่าย (฿)</label>
                <input type="number" className={`${inputClass} text-[#2ABFAB] font-bold text-lg`}
                  value={logCost} onChange={e => setLogCost(e.target.value)} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>วันที่ซ่อม</label>
                  <input type="date" className={inputClass} value={logDate} onChange={e => setLogDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>นัดครั้งต่อไป</label>
                  <input type="date" className={inputClass} value={logNextDate} onChange={e => setLogNextDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={closeLogModal} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleSaveLog} disabled={saving}
                className="flex-1 py-3.5 bg-[#1B2F5E] text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-60">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
