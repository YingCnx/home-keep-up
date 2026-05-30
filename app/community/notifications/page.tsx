'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../../components/PageHeader'

type Notif = {
  id: string
  type: 'like' | 'comment' | 'reply' | 'follow'
  is_read: boolean
  created_at: string
  post_id: string | null
  comment_id: string | null
  actor: { id: string; display_name: string; avatar_url: string | null } | null
  post: { title: string } | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'เมื่อกี้'
  if (mins < 60)  return `${mins} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7)   return `${days} วันที่แล้ว`
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const TYPE_CONFIG = {
  like:    { icon: '❤️', color: 'bg-red-50',    text: 'ถูกใจโพสของคุณ' },
  comment: { icon: '💬', color: 'bg-[#E6F9F7]',   text: 'แสดงความคิดเห็นในโพสของคุณ' },
  reply:   { icon: '↩️', color: 'bg-violet-50', text: 'ตอบกลับความคิดเห็นของคุณ' },
  follow:  { icon: '👤', color: 'bg-green-50',  text: 'เริ่มติดตามคุณ' },
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState<string | null>(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/community')
    setUserId(user.id)
    await fetchNotifs(user.id)
    // mark all as is_read
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false)
  }

  const fetchNotifs = async (uid: string) => {
    const { data: rows } = await supabase
      .from('notifications')
      .select('id, type, is_read, created_at, post_id, comment_id, actor_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!rows || rows.length === 0) { setLoading(false); return }

    // fetch actors + posts separately
    const actorIds = [...new Set(rows.map((r: any) => r.actor_id).filter(Boolean))]
    const postIds  = [...new Set(rows.map((r: any) => r.post_id).filter(Boolean))]

    const [{ data: actors }, { data: posts }] = await Promise.all([
      actorIds.length > 0
        ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', actorIds)
        : Promise.resolve({ data: [] }),
      postIds.length > 0
        ? supabase.from('posts').select('id, title').in('id', postIds)
        : Promise.resolve({ data: [] }),
    ])

    const actorMap = Object.fromEntries((actors || []).map((a: any) => [a.id, a]))
    const postMap  = Object.fromEntries((posts  || []).map((p: any) => [p.id, p]))

    const enriched = rows.map((r: any) => ({
      ...r,
      actor: actorMap[r.actor_id] || null,
      post:  postMap[r.post_id]   || null,
    }))

    setNotifs(enriched as any)
    setLoading(false)
  }

  const clearAll = async () => {
    if (!userId) return
    await supabase.from('notifications').delete().eq('user_id', userId)
    setNotifs([])
  }

  const getLink = (n: Notif) => {
    if (n.type === 'follow') return `/community/profile/${n.actor?.id}`
    if (n.post_id) return `/community/post/${n.post_id}`
    return '/community'
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-12">
      <PageHeader title="การแจ้งเตือน" backHref="/community" rightElement={
        notifs.length > 0 ? (
          <button onClick={clearAll} className="text-white/80 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/20 active:bg-white/30">
            ล้างทั้งหมด
          </button>
        ) : undefined
      } />

      <div className="px-5 pt-4 space-y-2">
        {loading && [...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-3 flex gap-2.5 animate-pulse border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-3/4 bg-slate-100 rounded" />
              <div className="h-2 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        ))}

        {!loading && notifs.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-3xl border border-slate-100 flex items-center justify-center shadow-sm">
              <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <p className="text-slate-400 font-bold">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-slate-300 text-xs">เมื่อมีคนไลค์หรือคอมเม้นท์โพสของคุณ<br/>จะแสดงที่นี่</p>
          </div>
        )}

        {!loading && notifs.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.like
          return (
            <Link key={n.id} href={getLink(n)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] ${
                n.is_read ? 'bg-white border-slate-100' : 'bg-[#E6F9F7]/60 border-[#B2EDE8]'
              }`}>

              {/* Actor avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#E6F9F7] flex items-center justify-center">
                  {n.actor?.avatar_url
                    ? <img src={n.actor.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <span className="text-[#2ABFAB] font-bold text-xs">{(n.actor?.display_name || '?')[0]?.toUpperCase()}</span>
                  }
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-md ${cfg.color} flex items-center justify-center text-[9px] border border-white`}>
                  {cfg.icon}
                </span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-xs font-bold truncate">
                  {n.actor?.display_name || 'ผู้ใช้'}
                  <span className="font-normal text-slate-500"> {cfg.text}</span>
                </p>
                {n.post?.title && (
                  <p className="text-slate-400 text-[10px] truncate">"{n.post.title}"</p>
                )}
                <p className="text-slate-300 text-[10px]">{timeAgo(n.created_at)}</p>
              </div>

              {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#2ABFAB] flex-shrink-0" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
