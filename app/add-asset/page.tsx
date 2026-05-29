'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import PageHeader from '../components/PageHeader'

export default function AddAssetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selector, setSelector] = useState<'home' | 'car' | 'motorcycle'>('home')
  const [formData, setFormData] = useState({
    name: '', asset_number: '', purchase_price: '',
    area_size: '', mileage_at_purchase: '', note: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const assetType = selector === 'home' ? 'home' : 'vehicle'
    const vehicleType = selector === 'car' ? 'รถยนต์' : selector === 'motorcycle' ? 'มอเตอร์ไซค์' : null
    const { error } = await supabase.from('assets').insert([{
      name: formData.name, type: assetType, vehicle_type: vehicleType,
      asset_number: formData.asset_number,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      area_size: selector === 'home' ? formData.area_size : null,
      mileage_at_purchase: selector !== 'home' ? parseInt(formData.mileage_at_purchase) : null,
      note: formData.note,
      user_id: user?.id
    }])
    if (error) alert(error.message)
    else { router.push('/'); router.refresh() }
    setLoading(false)
  }

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-10 text-slate-900">
      <PageHeader title="เพิ่มทรัพย์สิน" backHref="/" />

      <div className="px-5 pt-5">
        {/* Type Selector */}
        <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 mb-5 border border-slate-100">
          {[
            { id: 'home', label: 'บ้าน', icon: '🏠' },
            { id: 'car', label: 'รถ', icon: '🚗' }
          ].map(item => (
            <button key={item.id} type="button" onClick={() => setSelector(item.id as any)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 transition-all ${selector === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>
              <span className="text-base">{item.icon}</span>
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
