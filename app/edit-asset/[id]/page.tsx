// app/edit-asset/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function EditAssetPage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  const [type, setType] = useState<'home' | 'car' | 'motorcycle'>('home')
  const [formData, setFormData] = useState({
    name: '',
    asset_number: '',
    purchase_price: '',
    area_size: '',
    mileage_at_purchase: '',
    note: ''
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // ดึงข้อมูลเดิมมาแสดงในฟอร์ม
  useEffect(() => {
    const fetchAsset = async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setFormData({
          name: data.name || '',
          asset_number: data.asset_number || '',
          purchase_price: data.purchase_price?.toString() || '',
          area_size: data.area_size || '',
          mileage_at_purchase: data.mileage_at_purchase?.toString() || '',
          note: data.note || ''
        })
        setType(data.type)
        setImageUrl(data.image_url || null)
      }
      setLoading(false)
    }
    fetchAsset()
  }, [id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)

    let finalImageUrl = imageUrl
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const fileName = `${id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, imageFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName)
        finalImageUrl = publicUrl
      }
    }

    const { error } = await supabase
      .from('assets')
      .update({
        name: formData.name,
        asset_number: formData.asset_number,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        area_size: type === 'home' ? formData.area_size : null,
        mileage_at_purchase: type !== 'home' ? parseInt(formData.mileage_at_purchase) : null,
        note: formData.note,
        image_url: finalImageUrl
      })
      .eq('id', id)

    if (error) {
      alert(error.message)
    } else {
      router.push('/')
      router.refresh()
    }
    setUpdating(false)
  }

  if (loading) return (
    <div className="max-w-md mx-auto h-screen flex items-center justify-center bg-[#F5F3FF] text-[#7C3AED] font-bold">
      Loading Asset...
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5F3FF] text-slate-900 pb-10 font-sans shadow-2xl shadow-purple-100">
      {/* Header สไตล์เดียวกับหน้า Add และ Dashboard */}
      <div className="bg-[#7C3AED] h-52 rounded-b-[3.5rem] p-8 text-white relative overflow-hidden shadow-lg">
        <div className="flex justify-between items-center relative z-10 mb-6">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all"
          >
            ←
          </button>
          <div className="text-xs font-bold bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest">
            Edit Mode
          </div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight">Edit Asset</h1>
          <p className="text-white/60 text-xs font-medium mt-1">แก้ไขข้อมูล {type === 'home' ? 'บ้าน/คอนโด' : 'ยานพาหนะ'} ของคุณ</p>
        </div>

        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="px-6 -mt-8 relative z-20">
        <form onSubmit={handleUpdate} className="space-y-5">
          
          {/* รูปภาพ */}
          <div className="relative">
            {(imagePreview || imageUrl) ? (
              <div className="relative rounded-[2.2rem] overflow-hidden h-44 shadow-lg">
                <img src={imagePreview || imageUrl!} className="w-full h-full object-cover" alt="asset" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <label className="bg-white/90 text-slate-800 font-black text-xs px-4 py-2 rounded-full cursor-pointer active:scale-95 transition-all">
                    📷 เปลี่ยนรูป
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="w-full bg-white/50 border-2 border-dashed border-purple-200 rounded-[2.2rem] p-8 flex flex-col items-center gap-2 cursor-pointer active:bg-purple-50 transition-all">
                <span className="text-3xl">{type === 'home' ? '🏠' : type === 'car' ? '🚗' : '🏍️'}</span>
                <span className="text-[11px] font-bold text-slate-400">กดเพื่อเพิ่มรูป</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* การ์ดฟอร์มแก้ไข */}
          <div className="bg-white rounded-[2.8rem] p-7 shadow-xl shadow-purple-50 space-y-5 border border-white">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Name</label>
              <input 
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none border-2 border-transparent focus:border-purple-200 transition-all font-bold text-slate-700 shadow-inner"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">
                  {type === 'home' ? 'House No.' : 'License No.'}
                </label>
                <input 
                  className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none shadow-inner font-bold text-slate-700"
                  value={formData.asset_number}
                  onChange={e => setFormData({...formData, asset_number: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">
                  {type === 'home' ? 'Area' : 'Mileage'}
                </label>
                <input 
                  className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none shadow-inner font-bold text-slate-700 text-sm"
                  value={type === 'home' ? formData.area_size : formData.mileage_at_purchase}
                  onChange={e => type === 'home' 
                    ? setFormData({...formData, area_size: e.target.value})
                    : setFormData({...formData, mileage_at_purchase: e.target.value})
                  }
                />
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Cost (฿)</label>
              <input 
                type="number"
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none text-[#7C3AED] font-black text-xl shadow-inner"
                value={formData.purchase_price}
                onChange={e => setFormData({...formData, purchase_price: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-2">Notes</label>
              <textarea 
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 h-24 outline-none resize-none shadow-inner font-medium text-slate-600 text-sm"
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          {/* ปุ่มบันทึกการเปลี่ยนแปลง */}
          <button
            type="submit"
            disabled={updating}
            className="w-full bg-[#7C3AED] text-white py-5 rounded-[2.2rem] font-black text-lg shadow-2xl shadow-purple-200 active:scale-95 transition-all mb-4 mt-2 uppercase tracking-widest"
          >
            {updating ? 'Updating...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}