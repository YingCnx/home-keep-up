'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddAssetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [type, setType] = useState<'home' | 'car' | 'motorcycle'>('home')
  const [formData, setFormData] = useState({
    name: '',
    asset_number: '',
    purchase_price: '',
    area_size: '',
    mileage_at_purchase: '',
    note: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('assets').insert([
      {
        name: formData.name,
        type,
        asset_number: formData.asset_number,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        area_size: type === 'home' ? formData.area_size : null,
        mileage_at_purchase: type !== 'home' ? parseInt(formData.mileage_at_purchase) : null,
        note: formData.note,
        user_id: user?.id
      }
    ])

    if (error) alert(error.message)
    else {
      router.push('/')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8F7FF] text-slate-900 pb-10 font-sans shadow-2xl shadow-purple-100">
      {/* Header - ปรับความสูงให้กระชับขึ้น (h-48) */}
      <div className="bg-[#7C3AED] h-48 rounded-b-[3rem] p-8 text-white relative overflow-hidden shadow-lg">
        <div className="flex justify-between items-center relative z-10 mb-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all"
          >
            ←
          </button>
          <div className="text-[11px] font-bold bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-md uppercase tracking-widest">
            New Entry
          </div>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight">Add Asset</h1>
          <p className="text-white/70 text-[11px] font-medium mt-1">บันทึกทรัพย์สินใหม่เข้าสู่พอร์ตของคุณภู</p>
        </div>

        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="px-6 -mt-8 relative z-20">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ส่วนเลือกประเภททรัพย์สิน - Compact Style */}
          <div className="bg-white/90 backdrop-blur-xl p-1.5 rounded-[2rem] flex gap-1 shadow-lg shadow-purple-100/40 border border-white">
            {[
              { id: 'home', label: 'บ้าน', icon: '🏠' },
              { id: 'car', label: 'รถยนต์', icon: '🚗' },
              { id: 'motorcycle', label: 'มอไซค์', icon: '🏍️' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id as any)}
                className={`flex-1 py-3 rounded-[1.6rem] font-bold text-[11px] flex flex-col items-center gap-0.5 transition-all duration-300 ${
                  type === item.id 
                  ? 'bg-[#7C3AED] text-white shadow-md' 
                  : 'text-slate-400 bg-transparent'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
          </div>

          {/* การ์ดฟอร์ม - ปรับความโค้งให้เป็น 2.2rem เพื่อความกระชับ */}
          <div className="bg-white rounded-[2.2rem] p-6 shadow-xl shadow-purple-50 space-y-4 border border-white">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Name</label>
              <input 
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none border-2 border-transparent focus:border-purple-200 transition-all font-bold text-slate-700 shadow-inner text-sm"
                placeholder={type === 'home' ? "ชื่อบ้าน/คอนโด" : "แบรนด์/รุ่น"}
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">
                  {type === 'home' ? 'House No.' : 'License No.'}
                </label>
                <input 
                  className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none shadow-inner font-bold text-slate-700 text-sm"
                  placeholder={type === 'home' ? "123/45" : "กข1234"}
                  value={formData.asset_number}
                  onChange={e => setFormData({...formData, asset_number: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">
                  {type === 'home' ? 'Area' : 'Mileage'}
                </label>
                <input 
                  className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none shadow-inner font-bold text-slate-700 text-sm"
                  placeholder={type === 'home' ? "ตร.ม." : "กม."}
                  value={type === 'home' ? formData.area_size : formData.mileage_at_purchase}
                  onChange={e => type === 'home' 
                    ? setFormData({...formData, area_size: e.target.value})
                    : setFormData({...formData, mileage_at_purchase: e.target.value})
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Cost (฿)</label>
              <input 
                type="number"
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none text-[#7C3AED] font-black text-xl shadow-inner"
                placeholder="0.00"
                value={formData.purchase_price}
                onChange={e => setFormData({...formData, purchase_price: e.target.value})}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Notes</label>
              <textarea 
                className="w-full bg-[#F5F3FF] rounded-2xl p-4 h-20 outline-none resize-none shadow-inner font-medium text-slate-600 text-sm"
                placeholder="..."
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              />
            </div>
          </div>

          {/* ปุ่มบันทึก - ปรับความสูงลดลงเล็กน้อย (py-4) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7C3AED] text-white py-4 rounded-[1.8rem] font-black text-base shadow-2xl shadow-purple-200 active:scale-95 transition-all mt-2 uppercase tracking-widest"
          >
            {loading ? 'Processing...' : 'Save Asset'}
          </button>
        </form>
      </div>
    </div>
  )
}