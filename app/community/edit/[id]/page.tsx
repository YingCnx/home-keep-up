'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '../../../components/PageHeader'
import { useFeedback } from '../../../components/Feedback'

const POST_TYPES = [
  { key: 'tip',       label: 'เคล็ดลับ',  desc: 'แชร์ความรู้ วิธีดูแล',      color: 'bg-[#E6F9F7] text-[#2ABFAB] border-[#2ABFAB]' },
  { key: 'question',  label: 'คำถาม',     desc: 'ถามปัญหา ขอคำแนะนำ',        color: 'bg-amber-50 text-amber-600 border-amber-200' },
  { key: 'recommend', label: 'แนะนำ',     desc: 'แนะนำช่าง ร้านซ่อม บริการ', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  { key: 'diy',       label: 'DIY',       desc: 'วิธีทำเอง ซ่อมเอง',          color: 'bg-green-50 text-green-600 border-green-200' },
  { key: 'review',    label: 'รีวิว',     desc: 'รีวิวสินค้า อะไหล่ อุปกรณ์', color: 'bg-sky-50 text-sky-600 border-sky-200' },
]

export default function EditPostPage() {
  const { id }     = useParams()
  const router     = useRouter()
  const { toast, confirm } = useFeedback()
  const fileRef    = useRef<HTMLInputElement>(null)

  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState<string | null>(null)
  const [type, setType]               = useState('tip')
  const [title, setTitle]             = useState('')
  const [content, setContent]         = useState('')
  const [tagInput, setTagInput]       = useState('')
  const [tags, setTags]               = useState<string[]>([])
  const [categoryId, setCategoryId]   = useState('')
  const [categories, setCategories]   = useState<any[]>([])
  const [saving, setSaving]           = useState(false)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [imageFile, setImageFile]     = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading]     = useState(false)

  useEffect(() => { init() }, [id])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/community')
    setUserId(user.id)

    const [{ data: post }, { data: cats }] = await Promise.all([
      supabase.from('posts').select('*').eq('id', id).single(),
      supabase.from('categories').select('*').order('sort_order'),
    ])

    if (!post || post.user_id !== user.id) {
      toast('ไม่มีสิทธิ์แก้ไขโพสนี้', 'error')
      return router.push('/community')
    }

    setType(post.type)
    setTitle(post.title)
    setContent(post.content)
    setTags(post.tags || [])
    setCategoryId(post.category_id || '')
    setExistingImage(post.metadata?.image_url || null)
    setImagePreview(post.metadata?.image_url || null)
    setCategories(cats || [])
    setLoading(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error')
    if (file.size > 5 * 1024 * 1024) return toast('รูปต้องมีขนาดไม่เกิน 5MB', 'error')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !userId) return existingImage
    setUploading(true)
    const ext  = imageFile.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('community').upload(path, imageFile, { upsert: true })
    setUploading(false)
    if (error) { toast('อัปโหลดรูปไม่สำเร็จ', 'error'); return existingImage }
    const { data: { publicUrl } } = supabase.storage.from('community').getPublicUrl(path)
    return publicUrl
  }

  const addTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (cleaned && !tags.includes(cleaned) && tags.length < 5) setTags(prev => [...prev, cleaned])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const handleSubmit = async () => {
    if (!title.trim())   return toast('กรุณาใส่หัวข้อ', 'error')
    if (!content.trim()) return toast('กรุณาใส่เนื้อหา', 'error')

    setSaving(true)
    const imageUrl = imageFile ? await uploadImage() : (imagePreview ? existingImage : null)

    const { error } = await supabase.from('posts').update({
      type,
      title:       title.trim(),
      content:     content.trim(),
      category_id: categoryId || null,
      tags,
      metadata:    imageUrl ? { image_url: imageUrl } : {},
      updated_at:  new Date().toISOString(),
    }).eq('id', id)

    if (error) toast('บันทึกไม่สำเร็จ: ' + error.message, 'error')
    else { toast('อัปเดตแล้ว!', 'success'); router.push(`/community/post/${id}`) }
    setSaving(false)
  }

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-[#2ABFAB] transition-all font-medium text-slate-700 text-sm"
  const labelClass = "text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block"

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans">
      <div className="h-14 bg-[#1B2F5E]" />
      <div className="px-5 pt-5 space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-12">

      <PageHeader title="แก้ไขโพส" backHref={`/community/post/${id}`} />

      <div className="px-5 pt-5 space-y-5">

        {/* Post Type */}
        <div>
          <label className={labelClass}>ประเภทโพส</label>
          <div className="grid grid-cols-2 gap-2">
            {POST_TYPES.map(t => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${
                  type === t.key ? t.color : 'bg-white border-slate-100 text-slate-400'
                }`}>
                <p className="font-bold text-sm">{t.label}</p>
                <p className={`text-[11px] mt-0.5 ${type === t.key ? 'opacity-70' : 'text-slate-400'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>หัวข้อ</label>
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          <p className="text-slate-300 text-[10px] text-right mt-1 mr-1">{title.length}/100</p>
        </div>

        {/* Content */}
        <div>
          <label className={labelClass}>เนื้อหา</label>
          <textarea className={`${inputClass} resize-none`} rows={6}
            value={content} onChange={e => setContent(e.target.value)} maxLength={2000} />
          <p className="text-slate-300 text-[10px] text-right mt-1 mr-1">{content.length}/2000</p>
        </div>

        {/* Image */}
        <div>
          <label className={labelClass}>รูปภาพ <span className="normal-case font-medium opacity-50">(ถ้ามี, ไม่เกิน 5MB)</span></label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-100">
              <img src={imagePreview} alt="preview" className="w-full h-48 object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="w-8 h-8 bg-black/50 rounded-xl flex items-center justify-center text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="w-8 h-8 bg-black/50 rounded-xl flex items-center justify-center text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-100 transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs font-medium">แตะเพื่อเพิ่มรูป</span>
            </button>
          )}
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>หมวดหมู่ <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
          <select className={inputClass} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">-- เลือกหมวดหมู่ --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className={labelClass}>แท็ก <span className="normal-case font-medium opacity-50">(สูงสุด 5 แท็ก)</span></label>
          <div className="flex gap-2">
            <input className={`${inputClass} flex-1`} value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
              placeholder="พิมพ์แล้วกด Enter" />
            <button onClick={addTag} className="bg-[#1B2F5E] text-white px-4 rounded-2xl font-bold text-sm flex-shrink-0">เพิ่ม</button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-[#E6F9F7] text-[#2ABFAB] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#B2EDE8]">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-[#2ABFAB] hover:text-[#2ABFAB]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving || uploading || !title || !content}
          className="w-full py-4 bg-[#1B2F5E] text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {(saving || uploading) && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {uploading ? 'กำลังอัปโหลดรูป...' : saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
        </button>

      </div>
    </div>
  )
}
