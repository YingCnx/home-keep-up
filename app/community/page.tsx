'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { useProfile } from '../lib/useProfile'

type PostType = 'all' | 'tip' | 'question' | 'recommend' | 'diy' | 'review'

const POST_TYPES = [
  { key: 'all',       label: 'ทั้งหมด' },
  { key: 'tip',       label: 'เคล็ดลับ' },
  { key: 'question',  label: 'คำถาม' },
  { key: 'recommend', label: 'แนะนำ' },
  { key: 'diy',       label: 'DIY' },
  { key: 'review',    label: 'รีวิว' },
]

const TYPE_STYLE: Record<string, string> = {
  tip:       'bg-[#E6F9F7] text-[#2ABFAB]',
  question:  'bg-amber-50 text-amber-600',
  recommend: 'bg-violet-50 text-violet-600',
  diy:       'bg-green-50 text-green-600',
  review:    'bg-sky-50 text-sky-600',
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

export default function CommunityPage() {
  const { profile: myProfile } = useProfile()
  const [posts, setPosts]             = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<PostType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag]     = useState<string | null>(null)
  const [myId, setMyId]               = useState<string | null>(null)
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => { initProfile() }, [])
  useEffect(() => { fetchPosts() }, [filter])
  useEffect(() => {
    if (!myId) return
    const channel = supabase
      .channel('notifications_' + myId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${myId}`,
      }, () => {
        setUnreadCount(c => c + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [myId])

  const initProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: user.user_metadata?.name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id', ignoreDuplicates: true })
    const { data: reactions } = await supabase
      .from('reactions').select('entity_id')
      .eq('user_id', user.id).eq('entity_type', 'post')
    if (reactions) setMyReactions(new Set(reactions.map((r: any) => r.entity_id)))

    const { count } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_read', false)
    setUnreadCount(count || 0)
  }

  const fetchPosts = async () => {
    setLoading(true)
    let query = supabase
      .from('posts')
      .select('*, profiles(id, display_name, avatar_url), categories(name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('type', filter)
    const { data } = await query

    if (data) {
      const enriched = await Promise.all(data.map(async (post: any) => {
        const [{ count: likes }, { count: comments }] = await Promise.all([
          supabase.from('reactions').select('*', { count: 'exact', head: true })
            .eq('entity_type', 'post').eq('entity_id', post.id),
          supabase.from('comments').select('*', { count: 'exact', head: true })
            .eq('post_id', post.id).eq('status', 'published'),
        ])
        return { ...post, like_count: likes || 0, comment_count: comments || 0 }
      }))
      setPosts(enriched)
    }
    setLoading(false)
  }

  const filteredPosts = posts.filter(post => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !q || (
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      post.profiles?.display_name?.toLowerCase().includes(q) ||
      post.tags?.some((t: string) => t.toLowerCase().includes(q))
    )
    const matchTag = !activeTag || post.tags?.includes(activeTag)
    return matchSearch && matchTag
  })

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag)
    setSearchQuery('')
  }

  const clearSearch = () => { setSearchQuery(''); setActiveTag(null) }

  const handleLike = async (postId: string) => {
    if (!myId) return
    if (myReactions.has(postId)) {
      await supabase.from('reactions').delete()
        .eq('user_id', myId).eq('entity_type', 'post').eq('entity_id', postId)
      setMyReactions(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p))
    } else {
      await supabase.from('reactions').insert({ user_id: myId, entity_type: 'post', entity_id: postId, type: 'like' })
      setMyReactions(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p))
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="ชุมชน" showBack={false}
        leftElement={myId ? (
          <Link href={`/community/profile/${myId}`}
            className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-white/40 flex-shrink-0 bg-white/20 flex items-center justify-center active:opacity-80 transition-all">
            {myProfile?.avatar_url
              ? <img src={myProfile.avatar_url} className="w-full h-full object-cover" alt="profile" />
              : <span className="text-white font-bold text-sm">
                  {(myProfile?.display_name || '?')[0]?.toUpperCase()}
                </span>
            }
          </Link>
        ) : undefined}
        rightElement={
          <div className="flex items-center gap-2">
            {/* Bell */}
            <Link href="/community/notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            {/* New post */}
            <Link href="/community/create"
              className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
          </div>
        } />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto px-5 pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {POST_TYPES.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key as PostType)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
              filter === t.key ? 'bg-[#1B2F5E] text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setActiveTag(null) }}
            placeholder="ค้นหาโพส หัวข้อ แท็ก ชื่อผู้ใช้..."
            className="w-full bg-white rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-slate-700 border border-slate-100 shadow-sm outline-none focus:border-[#2ABFAB] transition-all" />
          {(searchQuery || activeTag) && (
            <button onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        {/* Active tag filter */}
        {activeTag && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-slate-400 text-xs">กรองแท็ก:</span>
            <span className="flex items-center gap-1.5 bg-[#1B2F5E] text-white text-xs font-bold px-3 py-1 rounded-xl">
              #{activeTag}
              <button onClick={clearSearch} className="text-[#A7EDE5]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pt-1 space-y-3">

        {/* Skeleton */}
        {loading && [...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 animate-pulse border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 bg-slate-100 rounded" />
                <div className="h-2.5 w-1/4 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-4 w-3/4 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-full bg-slate-100 rounded" />
          </div>
        ))}

        {/* Empty */}
        {!loading && filteredPosts.length === 0 && posts.length > 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
            <svg className="w-10 h-10 text-slate-300 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p className="text-slate-400 font-bold text-sm">ไม่พบโพสที่ตรงกัน</p>
            <button onClick={clearSearch} className="mt-2 text-[#2ABFAB] text-sm font-bold">ล้างการค้นหา</button>
          </div>
        )}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center">
            <svg className="w-12 h-12 text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <p className="text-slate-400 font-bold">ยังไม่มีโพสในหมวดนี้</p>
            <Link href="/community/create" className="mt-3 text-[#2ABFAB] font-bold text-sm">+ เป็นคนแรกที่โพส</Link>
          </div>
        )}

        {/* Post cards */}
        {!loading && filteredPosts.map(post => (
          <div key={post.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">

            {/* Author row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center">
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-[#2ABFAB] font-bold text-sm">{(post.profiles?.display_name || '?')[0]?.toUpperCase()}</span>
                }
              </div>
              <Link href={`/community/profile/${post.profiles?.id}`} className="flex-1 min-w-0">
                <p className="text-slate-800 font-bold text-sm truncate">{post.profiles?.display_name || 'ไม่ระบุชื่อ'}</p>
                <p className="text-slate-400 text-[11px]">{timeAgo(post.created_at)}</p>
              </Link>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0 ${TYPE_STYLE[post.type] || 'bg-slate-50 text-slate-500'}`}>
                {POST_TYPES.find(t => t.key === post.type)?.label}
              </span>
            </div>

            {/* Content */}
            <Link href={`/community/post/${post.id}`}>
              <h3 className="text-slate-800 font-bold text-sm mb-1.5 leading-snug">{post.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{post.content}</p>
            </Link>

            {/* Image */}
            {post.metadata?.image_url && (
              <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-100">
                <img src={post.metadata.image_url} alt="" className="w-full h-44 object-cover" />
              </div>
            )}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {post.tags.slice(0, 4).map((tag: string) => (
                  <button key={tag} onClick={() => handleTagClick(tag)} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100 active:bg-[#E6F9F7] active:text-blue-500 active:border-blue-200 transition-all">#{tag}</button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
              <button onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 transition-all active:scale-90 ${myReactions.has(post.id) ? 'text-red-500' : 'text-slate-400'}`}>
                <svg width="15" height="15" viewBox="0 0 24 24"
                  fill={myReactions.has(post.id) ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span className="text-xs font-bold">{post.like_count}</span>
              </button>
              <Link href={`/community/post/${post.id}`} className="flex items-center gap-1.5 text-slate-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <span className="text-xs font-bold">{post.comment_count}</span>
              </Link>
              {post.categories && (
                <span className="ml-auto text-[10px] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {post.categories.name}
                </span>
              )}
            </div>

          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
