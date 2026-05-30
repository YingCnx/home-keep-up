'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams } from 'next/navigation'
import PageHeader from '../../components/PageHeader'
import { uploadImage } from '../../lib/uploadImage'
import { useFeedback } from '../../components/Feedback'
import { WrenchIcon, XIcon, ClockIcon, InboxIcon, CameraIcon } from '../../components/Icons'
import { LogCardSkeleton } from '../../components/Skeleton'

export default function EquipmentLogPage() {
  const { id } = useParams()
  const { confirm, toast } = useFeedback()
  const [equipment, setEquipment] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isEditEqModalOpen, setIsEditEqModalOpen] = useState(false)

  // Add log
  const [detail, setDetail] = useState('')
  const [cost, setCost] = useState('')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [nextServiceDate, setNextServiceDate] = useState('')
  const [logBrand, setLogBrand] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Edit equipment
  const [editName, setEditName] = useState('')
  const [editBrand, setEditBrand] = useState('')

  // Edit log
  const [editingLog, setEditingLog] = useState<any>(null)
  const [editDetail, setEditDetail] = useState('')
  const [editCost, setEditCost] = useState('')
  const [editServiceDate, setEditServiceDate] = useState('')
  const [editNextServiceDate, setEditNextServiceDate] = useState('')
  const [editLogBrand, setEditLogBrand] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const inputClass = "w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"
  const labelClass = "text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block"

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
    setIsEditEqModalOpen(false); toast('บันทึกแล้ว', 'success'); fetchData()
  }

  const handleDeleteLog = async (logId: string) => {
    if (!await confirm({ title: 'ลบรายการนี้?', confirmText: 'ลบ', danger: true })) return
    await supabase.from('maintenance_logs').delete().eq('id', logId)
    toast('ลบแล้ว', 'success')
    fetchData()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleAddLog = async () => {
    if (!detail) return toast('กรุณาระบุรายละเอียด', 'error')
    setUploading(true)

    let image_url = null
    if (imageFile) {
      try {
        image_url = await uploadImage(imageFile, 'receipts', `${id}/${Date.now()}`)
      } catch (err) {
        toast((err as Error).message, 'error')
        setUploading(false)
        return
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
    setUploading(false); setIsLogModalOpen(false); toast('บันทึกการซ่อมแล้ว', 'success'); fetchData()
  }

  const closeLogModal = () => {
    setIsLogModalOpen(false)
    setDetail(''); setCost(''); setNextServiceDate(''); setLogBrand('')
    setImageFile(null); setImagePreview(null)
  }

  const openEditLogModal = (log: any) => {
    setEditingLog(log)
    setEditDetail(log.detail || '')
    setEditCost(log.cost?.toString() || '')
    setEditServiceDate(log.service_date || '')
    setEditNextServiceDate(log.next_service_date || '')
    setEditLogBrand(log.brand || '')
  }

  const closeEditLogModal = () => {
    setEditingLog(null)
    setEditDetail(''); setEditCost('')
    setEditServiceDate(''); setEditNextServiceDate(''); setEditLogBrand('')
  }

  const handleUpdateLog = async () => {
    if (!editDetail) return toast('กรุณาระบุรายละเอียด', 'error')
    setEditSaving(true)
    const { error } = await supabase.from('maintenance_logs').update({
      detail: editDetail,
      brand: editLogBrand || null,
      cost: parseFloat(editCost) || 0,
      service_date: editServiceDate,
      next_service_date: editNextServiceDate || null,
    }).eq('id', editingLog.id)
    setEditSaving(false)
    if (error) return toast(error.message, 'error')
    toast('แก้ไขแล้ว', 'success')
    closeEditLogModal()
    fetchData()
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-32 font-sans">
      <div className="h-14 bg-blue-600 mb-4" />
      <div className="mx-5 mb-5 h-16 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="px-5">
        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
        <div className="space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
          <LogCardSkeleton />
          <LogCardSkeleton />
          <LogCardSkeleton />
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white pb-32 font-sans text-slate-900">
      <PageHeader title={equipment?.name || 'อุปกรณ์'}
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
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 shadow-sm"><WrenchIcon className="w-5 h-5" /></div>
        <div>
          <p className="text-slate-800 font-bold text-sm">{equipment?.name}</p>
          <p className="text-slate-400 text-xs">{equipment?.spaces?.name}{equipment?.brand ? ` · ${equipment.brand}` : ''}</p>
        </div>
      </div>

      <div className="px-5">
        {/* Summary */}
        <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <p className="text-slate-800 font-bold text-sm">ประวัติการซ่อมบำรุง</p>
            <p className="text-slate-400 text-xs">{logs.length} รายการ</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-blue-600 font-bold text-lg">฿{logs.reduce((sum, l) => sum + (l.cost || 0), 0).toLocaleString()}</p>
            <button onClick={() => setIsLogModalOpen(true)}
              className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
          {logs.map(log => (
            <div key={log.id} className="relative pl-10">
              <div className="absolute left-[17px] top-4 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white shadow-sm z-10" />
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-3">
                    <p className="font-bold text-slate-800 text-sm">{log.detail}</p>
                    {log.brand && (
                      <span className="inline-block mt-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-blue-100">{log.brand}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-blue-600 text-sm">฿{(log.cost || 0).toLocaleString()}</p>
                    <button onClick={() => openEditLogModal(log)} className="text-slate-300 hover:text-blue-400 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteLog(log.id)} className="text-slate-200 hover:text-red-400 transition-colors"><XIcon className="w-4 h-4" /></button>
                  </div>
                </div>

                {log.image_url && (
                  <a href={log.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2 relative">
                    <img src={log.image_url} alt="receipt" className="w-full h-36 object-cover rounded-2xl border border-slate-100" />
                    <span className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-lg">ดูรูปเต็ม</span>
                  </a>
                )}

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <p className="text-slate-400 text-[11px]">
                    {new Date(log.service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {log.next_service_date && (
                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                      <ClockIcon className="w-3 h-3 text-amber-500" />
                      <p className="text-amber-500 text-[11px] font-bold">
                        ครั้งต่อไป: {new Date(log.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center">
              <InboxIcon className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-slate-400 font-bold text-sm">ยังไม่มีประวัติการดูแล</p>
            </div>
          )}
        </div>
      </div>


      {/* Modal: Edit Equipment */}
      {isEditEqModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-slate-800 font-bold text-lg mb-5">แก้ไขข้อมูล</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>ชื่ออุปกรณ์</label>
                <input className={inputClass} value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่ออุปกรณ์" />
              </div>
              <div>
                <label className={labelClass}>ยี่ห้อ / รุ่น</label>
                <input className={inputClass} value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="ยี่ห้อ/รุ่น" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setIsEditEqModalOpen(false)} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleUpdateEquipment} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Log */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-slate-800 font-bold text-lg mb-1">แก้ไขรายการ</h3>
            <p className="text-slate-400 text-xs mb-5">{new Date(editingLog.service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>รายละเอียด</label>
                <input className={inputClass} value={editDetail} onChange={e => setEditDetail(e.target.value)} autoFocus />
              </div>
              <div>
                <label className={labelClass}>ยี่ห้อ / รุ่น <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                <input className={inputClass} value={editLogBrand} onChange={e => setEditLogBrand(e.target.value)} placeholder="ยี่ห้อ/รุ่น" />
              </div>
              <div>
                <label className={labelClass}>ค่าใช้จ่าย (฿)</label>
                <input type="number" className={`${inputClass} text-blue-600 font-bold text-lg`}
                  value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>วันที่ซ่อม</label>
                  <input type="date" className={inputClass} value={editServiceDate} onChange={e => setEditServiceDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>นัดครั้งต่อไป</label>
                  <input type="date" className={inputClass} value={editNextServiceDate} onChange={e => setEditNextServiceDate(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={closeEditLogModal} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleUpdateLog} disabled={editSaving}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-60">
                {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Service Log */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-slate-800 font-bold text-lg mb-5">บันทึกการซ่อมบำรุง</h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>รายละเอียด</label>
                <input className={inputClass} value={detail} onChange={e => setDetail(e.target.value)}
                  placeholder="เช่น เปลี่ยนน้ำมันเครื่อง" autoFocus />
              </div>

              <div>
                <label className={labelClass}>ยี่ห้อ / รุ่น <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                <input className={inputClass} value={logBrand} onChange={e => setLogBrand(e.target.value)}
                  placeholder={equipment?.brand || 'ยี่ห้อ/รุ่น'} />
              </div>

              <div>
                <label className={labelClass}>ค่าใช้จ่าย (฿)</label>
                <input type="number" className={`${inputClass} text-blue-600 font-bold text-lg`}
                  value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>วันที่ซ่อม</label>
                  <input type="date" className={inputClass} value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>นัดครั้งต่อไป</label>
                  <input type="date" className={inputClass} value={nextServiceDate} onChange={e => setNextServiceDate(e.target.value)} />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className={labelClass}>รูปใบเสร็จ / ความเสียหาย <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} className="w-full h-40 object-cover rounded-2xl border border-slate-100" alt="preview" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null) }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"><XIcon className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className="w-full bg-slate-50 rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 active:bg-slate-100 transition-all">
                    <CameraIcon className="w-7 h-7 text-slate-300" />
                    <span className="text-xs font-medium text-slate-400">กดเพื่อเลือกรูป</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={closeLogModal} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleAddLog} disabled={uploading}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-60">
                {uploading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
