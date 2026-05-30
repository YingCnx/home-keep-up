'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '../../../components/PageHeader'
import { useFeedback } from '../../../components/Feedback'

const POST_TYPES: Record<string, { label: string; style: string }> = {
  tip:       { label: 'เคล็ดลับ',  style: 'bg-[#E6F9F7] text-[#2ABFAB]' },
  question:  { label: 'คำถาม',     style: 'bg-amber-50 text-amber-600' },
  recommend: { label: 'แนะนำ',     style: 'bg-violet-50 text-violet-600' },
  diy:       { label: 'DIY',       style: 'bg-green-50 text-green-600' },
  review:    { label: 'รีวิว',     style: 'bg-sky-50 text-sky-600' },
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

const EXPERTISE_OPTIONS = ['บ้าน', 'รถยนต์', 'มอเตอร์ไซค์', 'ระบบไฟฟ้า', 'ระบบประปา', 'เครื่องใช้ไฟฟ้า', 'ช่างทั่วไป']

export default function ProfilePage() {
  const { id }   = useParams()
  const router   = useRouter()
  const { toast } = useFeedback()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [myId, setMyId]         = useState<string | null>(null)
  const [profile, setProfile]   = useState<any>(null)
  const [posts, setPosts]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  // Edit modal
  const [editOpen, setEditOpen]           = useState(false)
  const [editName, setEditName]           = useState('')
  const [editBio, setEditBio]             = useState('')
  const [editLocation, setEditLocation]   = useState('')
  const [editExpertise, setEditExpertise] = useState<string[]>([])
  const [editAvatar, setEditAvatar]       = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)

  const isOwn = myId === id

  useEffect(() => { init() }, [id])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const [{ data: profileData }, { data: postsData }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('posts').select('*, categories(name)')
        .eq('user_id', id).eq('status', 'published')
        .order('created_at', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
    ])

    setProfile(profileData)
    setPosts(postsData || [])
    setFollowerCount(followers || 0)
    setFollowingCount(following || 0)

    if (user && user.id !== id) {
      const { data: followData } = await supabase.from('follows')
        .select('follower_id').eq('follower_id', user.id).eq('following_id', id).maybeSingle()
      setIsFollowing(!!followData)
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!myId) return toast('กรุณาเข้าสู่ระบบก่อน', 'error')
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', id)
      setIsFollowing(false); setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: myId, following_id: id })
      setIsFollowing(true); setFollowerCount(c => c + 1)
    }
  }

  const openEdit = () => {
    setEditName(profile?.display_name || '')
    setEditBio(profile?.bio || '')
    setEditLocation(profile?.location || '')
    setEditExpertise(profile?.expertise || [])
    setEditAvatarPreview(profile?.avatar_url || null)
    setEditOpen(true)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('กรุณาเลือกไฟล์รูปภาพ', 'error')
    if (file.size > 3 * 1024 * 1024) return toast('รูปต้องไม่เกิน 3MB', 'error')
    setEditAvatar(file)
    setEditAvatarPreview(URL.createObjectURL(file))
  }

  const toggleExpertise = (item: string) => {
    setEditExpertise(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    )
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) return toast('กรุณาใส่ชื่อ', 'error')
    setSaving(true)

    let avatarUrl = profile?.avatar_url || null

    if (editAvatar && myId) {
      const ext  = editAvatar.name.split('.').pop()
      const path = `${myId}/avatar.${ext}`
      const { error } = await supabase.storage.from('community').upload(path, editAvatar, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('community').getPublicUrl(path)
        avatarUrl = publicUrl
      }
    }

    const { error } = await supabase.from('profiles').update({
      display_name: editName.trim(),
      bio:          editBio.trim() || null,
      location:     editLocation.trim() || null,
      expertise:    editExpertise,
      avatar_url:   avatarUrl,
      updated_at:   new Date().toISOString(),
    }).eq('id', myId)

    if (error) toast('บันทึกไม่สำเร็จ', 'error')
    else {
      toast('อัปเดตโปรไฟล์แล้ว', 'success')
      setEditOpen(false)
      setEditAvatar(null)
      init()
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="h-14 bg-[#1B2F5E]" />
      <div className="px-5 pt-5 space-y-4">
        <div className="bg-white rounded-3xl p-5 animate-pulse border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded mb-2" />
          <div className="h-3 w-2/3 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans">
      <PageHeader title="โปรไฟล์" backHref="/community" />
      <div className="text-center py-20 text-slate-400">ไม่พบผู้ใช้นี้</div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="โปรไฟล์" backHref="/community" />

      <div className="px-5 pt-5 space-y-4">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center border border-[#B2EDE8]">
              {profile.avatar_url
                ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                : <span className="text-[#2ABFAB] font-bold text-2xl">{(profile.display_name || '?')[0]?.toUpperCase()}</span>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-slate-800 font-bold text-base">{profile.display_name || 'ไม่ระบุชื่อ'}</h2>
                  {profile.location && (
                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {profile.location}
                    </p>
                  )}
                </div>
                {isOwn ? (
                  <button onClick={openEdit}
                    className="flex-shrink-0 bg-slate-50 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-100 active:scale-95 transition-all">
                    แก้ไข
                  </button>
                ) : (
                  <button onClick={handleFollow}
                    className={`flex-shrink-0 text-xs font-bold px-4 py-1.5 rounded-xl active:scale-95 transition-all ${
                      isFollowing ? 'bg-slate-100 text-slate-600' : 'bg-[#1B2F5E] text-white shadow-sm'
                    }`}>
                    {isFollowing ? 'ติดตามแล้ว' : '+ ติดตาม'}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-slate-800 font-bold text-sm">{posts.length}</p>
                  <p className="text-slate-400 text-[10px]">โพส</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-bold text-sm">{followerCount}</p>
                  <p className="text-slate-400 text-[10px]">ผู้ติดตาม</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-bold text-sm">{followingCount}</p>
                  <p className="text-slate-400 text-[10px]">กำลังติดตาม</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-slate-600 text-sm leading-relaxed mt-3 pt-3 border-t border-slate-50">{profile.bio}</p>
          )}

          {/* Expertise */}
          {profile.expertise?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.expertise.map((e: string) => (
                <span key={e} className="text-[11px] bg-[#E6F9F7] text-[#2ABFAB] font-bold px-2.5 py-1 rounded-xl border border-[#B2EDE8]">{e}</span>
              ))}
            </div>
          )}
        </div>

        {/* Posts */}
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-1">โพสทั้งหมด ({posts.length})</h3>

        {posts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">ยังไม่มีโพส</p>
            {isOwn && (
              <Link href="/community/create" className="mt-3 inline-block text-[#2ABFAB] font-bold text-sm">+ โพสแรกของคุณ</Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const typeInfo = POST_TYPES[post.type]
              return (
                <Link key={post.id} href={`/community/post/${post.id}`}>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-slate-800 font-bold text-sm leading-snug flex-1">{post.title}</h4>
                      {typeInfo && <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0 ${typeInfo.style}`}>{typeInfo.label}</span>}
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{post.content}</p>
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-50">
                      <p className="text-slate-400 text-[11px]">{timeAgo(post.created_at)}</p>
                      {post.categories && (
                        <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100">{post.categories.name}</span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-slate-800 font-bold text-lg mb-5">แก้ไขโปรไฟล์</h3>

              {/* Avatar */}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#E6F9F7] flex-shrink-0 flex items-center justify-center border border-[#B2EDE8]">
                  {editAvatarPreview
                    ? <img src={editAvatarPreview} className="w-full h-full object-cover" alt="" />
                    : <span className="text-[#2ABFAB] font-bold text-2xl">{editName[0]?.toUpperCase() || '?'}</span>
                  }
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="flex-1 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-2xl border border-slate-100 active:scale-95 transition-all">
                  เปลี่ยนรูปโปรไฟล์
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">ชื่อที่แสดง</label>
                  <input className="w-full bg-slate-50 rounded-2xl px-4 py-3 outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all font-medium text-slate-700 text-sm"
                    value={editName} onChange={e => setEditName(e.target.value)} maxLength={50} />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">เกี่ยวกับฉัน</label>
                  <textarea className="w-full bg-slate-50 rounded-2xl px-4 py-3 outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all font-medium text-slate-700 text-sm resize-none"
                    rows={3} value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={200}
                    placeholder="เล่าเกี่ยวกับตัวคุณสักเล็กน้อย..." />
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">จังหวัด / พื้นที่</label>
                  <input className="w-full bg-slate-50 rounded-2xl px-4 py-3 outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all font-medium text-slate-700 text-sm"
                    value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="เช่น กรุงเทพฯ, เชียงใหม่" />
                </div>

                {/* Expertise */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">ความเชี่ยวชาญ</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERTISE_OPTIONS.map(item => (
                      <button key={item} onClick={() => toggleExpertise(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          editExpertise.includes(item)
                            ? 'bg-[#1B2F5E] text-white border-[#1B2F5E]'
                            : 'bg-white text-slate-400 border-slate-100'
                        }`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={() => setEditOpen(false)} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
                <button onClick={handleSaveProfile} disabled={saving || !editName}
                  className="flex-1 py-3.5 bg-[#1B2F5E] text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
