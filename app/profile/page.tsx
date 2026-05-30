'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'
import PageHeader from '../components/PageHeader'
import { useFeedback } from '../components/Feedback'
import { LogOutIcon } from '../components/Icons'
import { useProfile } from '../lib/useProfile'

const EXPERTISE_OPTIONS = ['บ้าน', 'รถยนต์', 'มอเตอร์ไซค์', 'ระบบไฟฟ้า', 'ระบบประปา', 'เครื่องใช้ไฟฟ้า', 'ช่างทั่วไป']

export default function ProfilePage() {
  const router = useRouter()
  const { confirm, toast } = useFeedback()
  const { profile, refresh: refreshProfile } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)

  const [stats, setStats]           = useState({ assets: 0, logs: 0, total: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  const [editing, setEditing]               = useState(false)
  const [editName, setEditName]             = useState('')
  const [editBio, setEditBio]               = useState('')
  const [editLocation, setEditLocation]     = useState('')
  const [editExpertise, setEditExpertise]   = useState<string[]>([])
  const [editAvatar, setEditAvatar]         = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving]                 = useState(false)

  useEffect(() => { if (profile?.id) fetchStats() }, [profile?.id])

  const fetchStats = async () => {
    setStatsLoading(true)
    const [{ data: assets }, { data: logs }] = await Promise.all([
      supabase.from('assets').select('id'),
      supabase.from('maintenance_logs').select('cost'),
    ])
    const total = logs?.reduce((sum, l) => sum + (l.cost || 0), 0) || 0
    setStats({ assets: assets?.length || 0, logs: logs?.length || 0, total })
    setStatsLoading(false)
  }

  const openEdit = () => {
    setEditName(profile?.display_name || '')
    setEditBio(profile?.bio || '')
    setEditLocation(profile?.location || '')
    setEditExpertise(profile?.expertise || [])
    setEditAvatarPreview(profile?.avatar_url || null)
    setEditAvatar(null)
    setEditing(true)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('กรุณาเลือกไฟล์รูปภาพ', 'error')
    if (file.size > 3 * 1024 * 1024) return toast('รูปต้องไม่เกิน 3MB', 'error')
    setEditAvatar(file)
    setEditAvatarPreview(URL.createObjectURL(file))
  }

  const toggleExpertise = (item: string) =>
    setEditExpertise(prev => prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item])

  const handleSave = async () => {
    if (!editName.trim()) return toast('กรุณาใส่ชื่อ', 'error')
    setSaving(true)

    let avatarUrl = profile?.avatar_url || null

    if (editAvatar && profile?.id) {
      const ext  = editAvatar.name.split('.').pop()
      const timestamp = Date.now()
      const path = `${profile.id}/avatar_${timestamp}.${ext}`
      const { error } = await supabase.storage.from('community').upload(path, editAvatar, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('community').getPublicUrl(path)
        avatarUrl = publicUrl
      }
    }

    const [{ error: profileError }] = await Promise.all([
      supabase.from('profiles').update({
        display_name: editName.trim(),
        bio:          editBio.trim() || null,
        location:     editLocation.trim() || null,
        expertise:    editExpertise,
        avatar_url:   avatarUrl,
        updated_at:   new Date().toISOString(),
      }).eq('id', profile?.id),
      supabase.auth.updateUser({ data: { name: editName.trim(), avatar_url: avatarUrl } }),
    ])

    if (profileError) { toast('บันทึกไม่สำเร็จ', 'error'); setSaving(false); return }

    toast('บันทึกแล้ว', 'success')
    setEditing(false)
    setSaving(false)
    refreshProfile()
  }

  const handleLogout = async () => {
    if (!await confirm({ title: 'ออกจากระบบ?', message: 'คุณจะต้องเข้าสู่ระบบใหม่อีกครั้ง', confirmText: 'ออกจากระบบ', danger: true })) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName   = profile?.display_name || '-'
  const displayAvatar = profile?.avatar_url   || null

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24">

      <PageHeader title="โปรไฟล์" showBack={false} />

      <div className="px-5 pt-5">

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-[#E6F9F7] flex items-center justify-center">
            {displayAvatar
              ? <img src={displayAvatar} className="w-full h-full object-cover" alt="avatar" />
              : <span className="text-2xl font-bold text-[#2ABFAB]">{displayName[0]?.toUpperCase() || '?'}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-bold text-lg truncate">{displayName}</p>
            <p className="text-slate-400 text-sm truncate">{profile?.email}</p>
            {profile?.location && <p className="text-slate-400 text-xs mt-0.5">{profile.location}</p>}
          </div>
          <button onClick={openEdit}
            className="w-9 h-9 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 active:bg-slate-100 transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 mb-4">
            <p className="text-slate-500 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Expertise */}
        {(profile?.expertise?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.expertise.map((e: string) => (
              <span key={e} className="text-[11px] bg-[#E6F9F7] text-[#2ABFAB] font-bold px-3 py-1.5 rounded-xl border border-[#B2EDE8]">{e}</span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            {statsLoading
              ? <div className="h-7 w-8 bg-slate-100 rounded-lg animate-pulse mx-auto mb-1" />
              : <p className="text-2xl font-bold text-slate-800">{stats.assets}</p>}
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">รายการ</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            {statsLoading
              ? <div className="h-7 w-8 bg-slate-100 rounded-lg animate-pulse mx-auto mb-1" />
              : <p className="text-2xl font-bold text-slate-800">{stats.logs}</p>}
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">บันทึก</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            {statsLoading
              ? <div className="h-6 w-12 bg-slate-100 rounded-lg animate-pulse mx-auto mb-1" />
              : <p className="text-lg font-bold text-[#2ABFAB]">
                  {stats.total >= 1000 ? `฿${(stats.total/1000).toFixed(1)}k` : `฿${stats.total.toLocaleString()}`}
                </p>}
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">ค่าใช้จ่าย</p>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">บัญชี</p>
          </div>
          <button onClick={handleLogout}
            className="w-full px-5 py-4 flex items-center gap-3 text-red-500 active:bg-red-50 transition-colors">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center"><LogOutIcon className="w-4 h-4" /></div>
            <span className="font-bold text-sm">ออกจากระบบ</span>
          </button>
        </div>

        {/* ติดต่อและช่วยเหลือ */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">ติดต่อและช่วยเหลือ</p>
          </div>
          <a href="https://line.me/R/ti/p/@938itgeb" target="_blank" rel="noopener noreferrer"
            className="w-full px-5 py-4 flex items-center gap-3 active:bg-green-50 transition-colors">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 3.16 1.67 5.95 4.24 7.73L5.5 22l3.27-1.7C9.77 20.73 10.87 21 12 21c5.52 0 10-4.03 10-9S17.52 2 12 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-700">แจ้งปัญหา / ให้ feedback</p>
              <p className="text-xs text-slate-400">Line OA: @938itgeb</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>

        <p className="text-center text-slate-300 text-xs font-medium">KuBaan v1.0</p>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
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
                <button onClick={() => setEditing(false)} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
                <button onClick={handleSave} disabled={saving || !editName.trim()}
                  className="flex-1 py-3.5 bg-[#1B2F5E] text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
