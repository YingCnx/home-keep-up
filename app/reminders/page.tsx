'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'

function getDaysLeft(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function RemindersPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notifStatus, setNotifStatus] = useState<'default'|'granted'|'denied'>('default')
  const [filter, setFilter] = useState<'all'|'urgent'|'overdue'>('all')

  useEffect(() => {
    if ('Notification' in window) setNotifStatus(Notification.permission as any)
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    const { data } = await supabase
      .from('maintenance_logs')
      .select('*, equipments(name, spaces(name, assets(name, type)))')
      .not('next_service_date', 'is', null)
      .order('next_service_date', { ascending: true })
    setTasks(data || [])
    setLoading(false)
  }

  const requestNotification = async () => {
    if (!('Notification' in window)) return alert('เบราว์เซอร์นี้ไม่รองรับ Notification')
    const permission = await Notification.requestPermission()
    setNotifStatus(permission as any)
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js')
      new Notification('Home Keep Up 🏠', { body: 'เปิดการแจ้งเตือนสำเร็จแล้ว!' })
    }
  }

  const filtered = tasks.filter(task => {
    const days = getDaysLeft(task.next_service_date)
    if (filter === 'overdue') return days < 0
    if (filter === 'urgent') return days >= 0 && days <= 7
    return true
  })

  const overdue = tasks.filter(t => getDaysLeft(t.next_service_date) < 0).length
  const urgent = tasks.filter(t => { const d = getDaysLeft(t.next_service_date); return d >= 0 && d <= 7 }).length

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="บำรุงรักษา" />

      <div className="px-5 pt-5">

        {/* Summary Cards */}
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

        {/* Notification Banner */}
        {notifStatus === 'default' && (
          <button onClick={requestNotification}
            className="w-full mb-5 bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-md active:scale-95 transition-all">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🔔</div>
            <div className="text-left flex-1">
              <p className="font-bold text-sm">เปิดการแจ้งเตือน</p>
              <p className="text-blue-200 text-[11px]">รับแจ้งเตือนเมื่อใกล้ถึงกำหนด</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
        {notifStatus === 'granted' && (
          <div className="w-full mb-5 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="text-green-700 font-bold text-sm">เปิดการแจ้งเตือนแล้ว</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {[{key:'all',label:'ทั้งหมด'},{key:'overdue',label:'เลยกำหนด'},{key:'urgent',label:'ด่วน'}].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key as any)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${filter === tab.key ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filtered.map(task => {
            const days = getDaysLeft(task.next_service_date)
            const isOverdue = days < 0
            const isUrgent = days >= 0 && days <= 7
            const asset = task.equipments?.spaces?.assets
            const assetIcon = asset?.type === 'home' ? '🏠' : asset?.type === 'motorcycle' ? '🏍️' : '🚗'

            return (
              <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    {assetIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5">{asset?.name} · {task.equipments?.spaces?.name}</p>
                    <p className="text-slate-800 font-bold text-sm">{task.detail}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">@ {task.equipments?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${isOverdue ? 'bg-red-50 text-red-500' : isUrgent ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                      {isOverdue ? `เลย ${Math.abs(days)}d` : days === 0 ? 'วันนี้!' : `${days}d`}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {new Date(task.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-slate-400 font-bold">ไม่มีรายการที่ต้องดูแล</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
