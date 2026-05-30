'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '../../components/PageHeader'
import Link from 'next/link'
import { uploadImage } from '../../lib/uploadImage'
import { useFeedback } from '../../components/Feedback'
import { AssetIcon, CameraIcon } from '../../components/Icons'

export default function EditAssetPage() {
  const router = useRouter()
  const { id } = useParams()
  const { toast } = useFeedback()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [type, setType] = useState<'home' | 'vehicle'>('home')
  const [vehicleType, setVehicleType] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '', asset_number: '', purchase_price: '',
    area_size: '', mileage_at_purchase: '', note: ''
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    const fetchAsset = async () => {
      const { data } = await supabase.from('assets').select('*').eq('id', id).single()
      if (data) {
        setFormData({
          name: data.name || '', asset_number: data.asset_number || '',
          purchase_price: data.purchase_price?.toString() || '',
          area_size: data.area_size || '',
          mileage_at_purchase: data.mileage_at_purchase?.toString() || '',
          note: data.note || ''
        })
        setType(data.type)
        setVehicleType(data.vehicle_type || null)
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
      try {
        const url = await uploadImage(imageFile, 'assets', `${id}`)
        if (url) finalImageUrl = url
      } catch (err) {
        toast((err as Error).message, 'error')
      }
    }

    const { error } = await supabase.from('assets').update({
      name: formData.name, asset_number: formData.asset_number,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      area_size: type === 'home' ? formData.area_size : null,
      mileage_at_purchase: type !== 'home' ? parseInt(formData.mileage_at_purchase) : null,
      note: formData.note, image_url: finalImageUrl
    }).eq('id', id)

    if (error) toast(error.message, 'error')
    else { toast('บันทึกแล้ว', 'success'); router.push('/'); router.refresh() }
    setUpdating(false)
  }

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-10 text-slate-900">
      <PageHeader title="แก้ไขทรัพย์สิน" />

      <div className="px-5 pt-5 space-y-4">

        {/* Cover Image */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">รูปภาพ</label>
          {(imagePreview || imageUrl) ? (
            <div className="relative rounded-2xl overflow-hidden h-40">
              <img src={imagePreview || imageUrl!} className="w-full h-full object-cover" alt="asset" />
              <label className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer active:bg-black/40 transition-all">
                <span className="bg-white text-slate-800 font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5"><CameraIcon className="w-4 h-4" /> เปลี่ยนรูป</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          ) : (
            <label className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer active:bg-slate-100 transition-all">
              <AssetIcon type={type} vehicleType={vehicleType || undefined} className="w-7 h-7 text-slate-300" />
              <span className="text-slate-400 text-xs font-medium">กดเพื่อเพิ่มรูป</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>

        {/* Type (locked) */}
        <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-3 border border-slate-100">
          <AssetIcon type={type} vehicleType={vehicleType || undefined} className="w-6 h-6 text-slate-500" />
          <span className="text-slate-500 font-medium text-sm">{type === 'home' ? 'บ้าน' : vehicleType || 'รถ'}</span>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">ชื่อ</label>
            <input className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{type === 'home' ? 'บ้านเลขที่' : 'ทะเบียน'}</label>
              <input className={inputClass} value={formData.asset_number} onChange={e => setFormData({...formData, asset_number: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{type === 'home' ? 'พื้นที่' : 'เลขไมล์'}</label>
              <input className={inputClass}
                value={type === 'home' ? formData.area_size : formData.mileage_at_purchase}
                onChange={e => type === 'home' ? setFormData({...formData, area_size: e.target.value}) : setFormData({...formData, mileage_at_purchase: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">ราคาซื้อ (฿)</label>
            <input type="number" className={`${inputClass} text-blue-600 font-bold text-lg`}
              value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">หมายเหตุ</label>
            <textarea className={`${inputClass} h-20 resize-none`}
              value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
          </div>

          <button type="submit" disabled={updating}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base shadow-md active:scale-95 transition-all disabled:opacity-60">
            {updating ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </form>
      </div>
    </div>
  )
}
