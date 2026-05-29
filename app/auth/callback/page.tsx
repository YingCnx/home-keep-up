'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Supabase จะอ่าน code จาก URL และ exchange session ให้อัตโนมัติ
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/')
      } else {
        // รอ onAuthStateChange ในกรณีที่ยังไม่ได้ set session
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe()
            router.push('/')
          }
        })
        // timeout กันค้าง
        setTimeout(() => { subscription.unsubscribe(); router.push('/login') }, 5000)
      }
    })
  }, [])

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col items-center justify-center bg-white gap-4">
      <img src="/logo.png" alt="Home Keep Up" className="w-20 h-20 object-contain mb-2" />
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-blue-600 font-bold text-sm">กำลังเข้าสู่ระบบ...</p>
    </div>
  )
}
