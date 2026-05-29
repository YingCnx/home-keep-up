// app/reminders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RemindersPage() {
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])

  useEffect(() => {
    async function fetchReminders() {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('maintenance_logs')
        .select('*, equipments(name, spaces(assets(name)))')
        .not('next_service_date', 'is', null)
        .gte('next_service_date', today) // เอาเฉพาะที่ยังไม่ถึงกำหนด หรือถึงวันนี้
        .order('next_service_date', { ascending: true })
      
      setUpcomingTasks(data || [])
    }
    fetchReminders()
  }, [])

  return (
    <div className="p-6 max-w-2xl mx-auto text-black">
      <h1 className="text-2xl font-bold mb-6 text-red-600">🔔 กำหนดการที่ใกล้ถึง</h1>
      <div className="space-y-4">
        {upcomingTasks.map(task => (
          <div key={task.id} className="border p-4 rounded-xl shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{task.equipments?.name}</p>
                <p className="text-sm text-gray-500">
                  {task.equipments?.spaces?.assets?.name}
                </p>
                <p className="text-blue-600 mt-2">สิ่งที่ต้องทำ: {task.detail}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">กำหนดวันที่</p>
                <p className="font-bold text-red-500">
                  {new Date(task.next_service_date).toLocaleDateString('th-TH')}
                </p>
              </div>
            </div>
          </div>
        ))}
        {upcomingTasks.length === 0 && (
          <p className="text-center py-10 text-gray-400">ยังไม่มีกำหนดการซ่อมบำรุงในเร็วๆ นี้</p>
        )}
      </div>
    </div>
  )
}