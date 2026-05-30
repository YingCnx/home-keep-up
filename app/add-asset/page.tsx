'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '../components/PageHeader'
import { useFeedback } from '../components/Feedback'
import { uploadImage } from '../lib/uploadImage'
import { HomeIcon, CarIcon, CameraIcon } from '../components/Icons'
import { DEFAULT_SPACES } from '../lib/defaultStructure'

export default function AddAssetPage() {
  const router = useRouter()
  const { toast, confirm } = useFeedback()
  const [loading, setLoading] = useState(false)
  const [selector, setSelector] = useState<'home' | 'car' | 'motorcycle'>('home')
  const [formData, setFormData] = useState({
    name: '', asset_number: '', purchase_price: '',
    area_size: '', mileage_at_purchase: '', note: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. ยืนยันการบันทึก
    if (!await confirm({ title: 'บันทึกทรัพย์สินนี้?', confirmText: 'บันทึก' })) return

    // 2. ถามว่าต้องการพื้นที่พื้นฐานไหม
    const assetLabel = selector === 'home' ? 'บ้าน' : 'รถ'
    const spaceList = DEFAULT_SPACES[selector === 'home' ? 'home' : 'vehicle'].join(', ')
    const wantDefaultSpaces = await confirm({
      title: `สร้างพื้นที่พื้นฐานสำหรับ${assetLabel}?`,
      message: spaceList,
      confirmText: 'สร้างให้เลย',
      cancelText: 'ข้ามไป',
    })

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const assetType = selector === 'home' ? 'home' : 'vehicle'
    const vehicleType = selector === 'car' ? 'รถยนต์' : selector === 'motorcycle' ? 'มอเตอร์ไซค์' : null
    const { data: inserted, error } = await supabase.from('assets').insert([{
      name: formData.name, type: assetType, vehicle_type: vehicleType,
      asset_number: formData.asset_number,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      area_size: selector === 'home' ? formData.area_size : null,
      mileage_at_purchase: selector !== 'home' ? parseInt(formData.mileage_at_purchase) : null,
      note: formData.note,
      user_id: user?.id
    }]).select('id').single()

    if (error) { toast(error.message, 'error'); setLoading(false); return }

    // อัปโหลดรูป (ถ้ามี) แล้วผูกกับ asset ที่เพิ่งสร้าง
    if (imageFile && inserted?.id) {
      const url = await uploadImage(imageFile, 'assets', `${inserted.id}`)
      if (url) await supabase.from('assets').update({ image_url: url }).eq('id', inserted.id)
    }

    // สร้างพื้นที่พื้นฐานให้ (ถ้าเลือก)
    if (wantDefaultSpaces && inserted?.id) {
      const spaces = DEFAULT_SPACES[assetType].map(name => ({ name, asset_id: inserted.id }))
      await supabase.from('spaces').insert(spaces)
    }

    toast('เพิ่มทรัพย์สินแล้ว', 'success')
    router.push('/'); router.refresh()
    setLoading(false)
  }

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-10 text-slate-900">
      <PageHeader title="เพิ่มทรัพย์สิน" backHref="/" />

      <div className="px-5 pt-5">
        {/* Cover Image */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">รูปภาพ</label>
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
              <label className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer active:bg-black/40 transition-all">
                <span className="bg-white text-slate-800 font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5"><CameraIcon className="w-4 h-4" /> เปลี่ยนรูป</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          ) : (
            <label className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer active:bg-slate-100 transition-all">
              <span className="text-slate-300">{selector === 'home' ? <HomeIcon className="w-7 h-7" /> : <CarIcon className="w-7 h-7" />}</span>
              <span className="text-slate-400 text-xs font-medium">กดเพื่อเพิ่มรูป</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>

        {/* Type Selector */}
        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 mb-5 border border-slate-100">
          {[
            { id: 'home', label: 'บ้าน', Icon: HomeIcon },
            { id: 'car', label: 'รถ', Icon: CarIcon }
          ].map(item => (
            <button key={item.id} type="button" onClick={() => setSelector(item.id as any)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 transition-all ${selector === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>
              <item.Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">ชื่อ</label>
            <input className={inputClass} placeholder={selector === 'home' ? 'ชื่อบ้าน/คอนโด' : 'แบรนด์/รุ่น'}
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                {selector === 'home' ? 'บ้านเลขที่' : 'ทะเบียน'}
              </label>
              <input className={inputClass} placeholder={selector === 'home' ? '123/45' : 'กข 1234'}
                value={formData.asset_number} onChange={e => setFormData({...formData, asset_number: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">
                {selector === 'home' ? 'พื้นที่' : 'เลขไมล์'}
              </label>
              <input className={inputClass} placeholder={selector === 'home' ? 'ตร.ม.' : 'กม.'}
                value={selector === 'home' ? formData.area_size : formData.mileage_at_purchase}
                onChange={e => selector === 'home' ? setFormData({...formData, area_size: e.target.value}) : setFormData({...formData, mileage_at_purchase: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">ราคาซื้อ (฿)</label>
            <input type="number" className={`${inputClass} text-blue-600 font-bold text-lg`} placeholder="0"
              value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">หมายเหตุ</label>
            <textarea className={`${inputClass} h-20 resize-none`} placeholder="..."
              value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-md active:scale-95 transition-all disabled:opacity-60 mt-2">
            {loading ? 'กำลังบันทึก...' : 'บันทึกทรัพย์สิน'}
          </button>
        </form>
      </div>
    </div>
  )
}
