'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '../../components/PageHeader'

export default function EquipmentLogPage() {
  const { id } = useParams()
  const router = useRouter()
  const [equipment, setEquipment] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // --- Modal States ---
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isEditEqModalOpen, setIsEditEqModalOpen] = useState(false)

  // --- Form States ---
  const [detail, setDetail] = useState('')
  const [cost, setCost] = useState('')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [nextServiceDate, setNextServiceDate] = useState('')
  const [logBrand, setLogBrand] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBrand, setEditBrand] = useState('')

  const fetchData = async () => {
    const { data: eqData } = await supabase.from('equipments').select('*, spaces(name)').eq('id', id).single()
    const { data: logsData } = await supabase.from('maintenance_logs').select('*').eq('equipment_id', id).order('service_date', { ascending: false })
    
    setEquipment(eqData)
    setEditName(eqData?.name || '')
    setEditBrand(eqData?.brand || '')
    setLogs(logsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const handleUpdateEquipment = async () => {
    await supabase.from('equipments').update({ name: editName, brand: editBrand }).eq('id', id)
    setIsEditEqModalOpen(false); fetchData();
  }

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    await supabase.from('maintenance_logs').delete().eq('id', logId)
    fetchData()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleAddLog = async () => {
    if (!detail) return alert('กรุณาระบุรายละเอียด')
    setUploading(true)

    let image_url = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const fileName = `${id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, imageFile, { upsert: true })
      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
        image_url = publicUrl
      }
    }

    await supabase.from('maintenance_logs').insert([{
      equipment_id: id,
      detail,
      brand: logBrand || equipment?.brand || null,
      cost: parseFloat(cost) || 0,
      service_date: serviceDate,
      next_service_date: nextServiceDate || null,
      image_url
    }])
    if (logBrand) await supabase.from('equipments').update({ brand: logBrand }).eq('id', id)
    setDetail(''); setCost(''); setNextServiceDate(''); setLogBrand('')
    setImageFile(null); setImagePreview(null)
    setUploading(false); setIsLogModalOpen(false); fetchData()
  }

  if (loading) return (
    <div className="max-w-md mx-auto h-screen flex items-center justify-center bg-[#F8F7FF]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 border-4 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#7C3AED] font-bold text-sm">กำลังโหลดประวัติ...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-24 font-sans text-slate-900">
      <PageHeader title={equipment?.name || 'Equipment'}
        rightElement={
          <button onClick={() => setIsEditEqModalOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        }
      />

      {/* Info Banner */}
      <div className="mx-5 mt-4 mb-5 bg-blue-50 rounded-2xl p-4 flex items-center gap-3 border border-blue-100">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">⚙️</div>
        <div>
          <p className="text-slate-800 font-bold text-sm">{equipment?.name}</p>
          <p className="text-slate-400 text-xs">{equipment?.spaces?.name}{equipment?.brand ? ` · ${equipment.brand}` : ''}</p>
        </div>
      </div>

      <div className="px-5">
        {/* รายงานยอดรวม */}
        <div className="flex justify-between items-end mb-8 bg-white p-5 rounded-[2rem] shadow-sm border border-white">
          <div>
            <h2 className="text-base font-bold text-slate-800">Service History</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">Maintenance Records</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Total Spent</p>
            <p className="text-xl font-black text-blue-600 leading-none tabular-nums">฿{logs.reduce((sum, l) => sum + (l.cost || 0), 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Timeline - ปรับปรุงสไตล์ตามคำขอคุณภู */}
        <div className="space-y-5 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
          {logs.map(log => (
            <div key={log.id} className="relative pl-10 group">
              {/* จุด Timeline */}
              <div className="absolute left-[17px] top-3 w-2 h-2 bg-blue-600 rounded-full border-2 border-white shadow-sm z-10"></div>
              
              <div className="bg-white rounded-[2.2rem] p-5 shadow-sm border border-white active:scale-[0.98] transition-all overflow-hidden relative">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-slate-800 text-[15px] leading-tight">{log.detail}</h4>
                    {log.brand && (
                      <span className="inline-block mt-1.5 bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-wider">
                        {log.brand}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDeleteLog(log.id)} className="text-slate-200 hover:text-red-400 p-1 transition-colors">✕</button>
                </div>
                
                {log.image_url && (
                  <a href={log.image_url} target="_blank" rel="noopener noreferrer" className="block mt-3 relative z-10">
                    <img src={log.image_url} alt="receipt" className="w-full h-36 object-cover rounded-2xl border border-purple-50" />
                    <span className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-lg">ดูรูปเต็ม</span>
                  </a>
                )}
                <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-50 relative z-10">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-200"></span>
                      <p className="text-[11px] text-slate-400 font-bold">
                        {new Date(log.service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {log.next_service_date && (
                      <div className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-lg">
                        <span className="text-[10px] animate-pulse">⏳</span>
                        <p className="text-[11px] font-bold text-red-400 uppercase tracking-tighter">
                          Next: {new Date(log.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="font-black text-blue-600 text-lg tabular-nums italic">฿{log.cost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-20 bg-white/50 border-2 border-dashed border-purple-200 rounded-[2.5rem] italic text-purple-300 font-bold">
              ยังไม่มีประวัติการดูแล
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button 
          onClick={() => setIsLogModalOpen(true)}
          className="w-16 h-16 bg-[#7C3AED] rounded-full flex items-center justify-center text-white text-4xl shadow-xl shadow-purple-200 active:scale-90 transition-all border-4 border-white"
        >+</button>
      </div>

      {/* Modal: แก้ไขข้อมูลอุปกรณ์ */}
      {isEditEqModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 text-slate-900">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-6 text-center italic uppercase tracking-widest underline decoration-purple-100 underline-offset-8">Edit Info</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Equipment Name</label>
                <input className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-bold text-sm shadow-inner border-2 border-transparent focus:border-purple-200 transition-all" value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่ออุปกรณ์" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Brand / Model</label>
                <input className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-medium text-sm shadow-inner border-2 border-transparent focus:border-purple-200 transition-all" value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="ยี่ห้อ/รุ่น" />
              </div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setIsEditEqModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold text-sm">Cancel</button>
              <button onClick={handleUpdateEquipment} className="flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-sm shadow-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: เพิ่มประวัติการซ่อม */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-28 z-50 text-slate-900">
          <div className="bg-white rounded-[2.8rem] p-8 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-purple-50 rounded-2xl mb-4 text-3xl">📝</div>
              <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">Add Service Log</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1 tracking-widest opacity-70">บันทึกข้อมูลการดูแลรักษา</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Detail</label>
                <input className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-bold text-sm shadow-inner border-2 border-transparent focus:border-purple-200 transition-all" value={detail} onChange={e => setDetail(e.target.value)} placeholder="เช่น เปลี่ยนน้ำมันเครื่อง" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Brand / Model <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                <input className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-medium text-sm shadow-inner border-2 border-transparent focus:border-purple-200 transition-all" value={logBrand} onChange={e => setLogBrand(e.target.value)} placeholder={equipment?.brand || 'ยี่ห้อ/รุ่น'} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Cost (฿)</label>
                <input type="number" className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-black text-[#7C3AED] text-xl shadow-inner border-2 border-transparent focus:border-purple-200 transition-all" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">Service Date</label>
                  <input type="date" className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none text-xs font-bold shadow-inner" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-red-300 uppercase tracking-widest ml-2 italic">Next Visit</label>
                  <input type="date" className="w-full bg-red-50/50 rounded-2xl p-4 outline-none text-xs font-bold text-red-500 shadow-inner" value={nextServiceDate} onChange={e => setNextServiceDate(e.target.value)} />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-2">รูปใบเสร็จ / ความเสียหาย <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} className="w-full h-40 object-cover rounded-2xl" alt="preview" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null) }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm"
                    >✕</button>
                  </div>
                ) : (
                  <label className="w-full bg-[#F5F3FF] rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-purple-200 active:bg-purple-50 transition-all">
                    <span className="text-2xl">📷</span>
                    <span className="text-[11px] font-bold text-slate-400">กดเพื่อเลือกรูป</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-8">
              <button onClick={() => { setIsLogModalOpen(false); setImageFile(null); setImagePreview(null) }} className="flex-1 py-4 text-slate-400 font-bold text-sm">Cancel</button>
              <button onClick={handleAddLog} disabled={uploading} className="flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-200 disabled:opacity-60">
                {uploading ? 'กำลังอัปโหลด...' : 'Save Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}