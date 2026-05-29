'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AssetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [asset, setAsset] = useState<any>(null)
  const [spaces, setSpaces] = useState<any[]>([])
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'systems' | 'history'>('systems')

  // --- Modal States ---
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [isEqModalOpen, setIsEqModalOpen] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [newEqName, setNewEqName] = useState('')
  const [newEqBrand, setNewEqBrand] = useState('')

  const fetchData = async () => {
  // 1. ดึงข้อมูล Asset ปกติ
  const { data: assetData } = await supabase.from('assets').select('*').eq('id', id).single()
  
  // 2. ดึงข้อมูล Spaces และ Equipments ปกติ
  const { data: spacesData } = await supabase.from('spaces').select('*, equipments(*)').eq('asset_id', id)
  
  // 3. ปรับปรุงการดึง Logs: กรองผ่าน Column ของตาราง Equipments ที่เรา Join เข้ามา
  // เราใช้ .not('equipments', 'is', null) เพื่อกรองเอาเฉพาะ Log ที่มี Equipment อยู่ใน Asset นี้เท่านั้น
  const { data: logsData } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      equipments!inner (
        name,
        spaces!inner (
          name,
          asset_id
        )
      )
    `)
    .eq('equipments.spaces.asset_id', id) // กรองเฉพาะ Asset ID ปัจจุบัน
    .order('service_date', { ascending: false })

  setAsset(assetData)
  setSpaces(spacesData || [])
  setAllLogs(logsData || [])
  setLoading(false)
}

  useEffect(() => { fetchData() }, [id])

  const handleAddSpace = async () => {
    if (!newSpaceName) return
    const { error } = await supabase.from('spaces').insert([{ name: newSpaceName, asset_id: id }])
    if (error) alert(error.message)
    else { setNewSpaceName(''); setIsSpaceModalOpen(false); fetchData(); }
  }

  const handleAddEquipment = async () => {
    if (!newEqName || !selectedSpaceId) return
    const { error } = await supabase.from('equipments').insert([{ 
      name: newEqName, brand: newEqBrand, space_id: selectedSpaceId 
    }])
    if (error) alert(error.message)
    else { setNewEqName(''); setNewEqBrand(''); setIsEqModalOpen(false); fetchData(); }
  }

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('ยืนยันการลบพื้นที่นี้? ข้อมูลข้างในจะหายทั้งหมด')) return
    const { error } = await supabase.from('spaces').delete().eq('id', spaceId)
    if (error) alert(error.message)
    else fetchData()
  }

  const handleDeleteEquipment = async (e: React.MouseEvent, eqId: string, eqName: string) => {
    e.preventDefault()
    if (!confirm(`ยืนยันการลบ "${eqName}"? ประวัติทั้งหมดจะหายไปด้วย`)) return
    const { error } = await supabase.from('equipments').delete().eq('id', eqId)
    if (error) alert(error.message)
    else fetchData()
  }

  if (loading) return <div className="max-w-md mx-auto h-screen flex items-center justify-center text-[#7C3AED] font-bold italic">Loading Dashboard...</div>

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F5F3FF] text-slate-900 pb-32 font-sans shadow-2xl shadow-purple-100 text-slate-900">
      {/* Top Nav */}
      <nav className="sticky top-0 z-20 bg-[#F5F3FF] p-6 pb-4 flex justify-between items-center">
        <div>
          <p className="text-[#7C3AED] text-sm font-bold uppercase tracking-widest opacity-80">Welcome back,</p>
          <h1 className="text-2xl font-bold text-slate-800">คุณภู (Phu)</h1>
        </div>
        <div className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center border-2 border-purple-100 overflow-hidden active:scale-90 transition-all">
          <span className="text-xl">🤵🏻‍♂️</span>
        </div>
      </nav>

      {/* Header & Specs Section */}
      <div className="bg-[#7C3AED] rounded-b-[3.5rem] p-8 text-white relative overflow-hidden shadow-lg">
        <div className="flex justify-between items-start relative z-10 mb-6 text-white">
          <button onClick={() => router.push('/')} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all">←</button>
          <Link href={`/edit-asset/${id}`} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-sm">✎</Link>
        </div>
        <div className="relative z-10 mb-6">
          <h1 className="text-3xl font-black tracking-tight leading-tight">{asset?.name}</h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{asset?.asset_number || 'No ID'}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-5 flex justify-between items-center border border-white/20 shadow-inner">
          <div className="text-center flex-1 text-white">
            <p className="text-[9px] uppercase font-bold opacity-50 mb-0.5">Price</p>
            <p className="text-sm font-black italic">฿{asset?.purchase_price?.toLocaleString()}</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="text-center flex-1 text-white">
            <p className="text-[9px] uppercase font-bold opacity-50 mb-0.5">{asset?.type === 'home' ? 'Area' : 'Mileage'}</p>
            <p className="text-sm font-black italic">{asset?.type === 'home' ? asset?.area_size : (asset?.mileage_at_purchase?.toLocaleString() + ' km')}</p>
          </div>
        </div>
        <div className="absolute -right-6 -top-6 w-36 h-36 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Tabs Selector */}
      <div className="px-6 mt-8">
        <div className="bg-white/50 p-1.5 rounded-[2.2rem] flex gap-1 shadow-sm border border-white mb-8">
          <button 
            onClick={() => setActiveTab('systems')}
            className={`flex-1 py-3.5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'systems' ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-200' : 'text-slate-400'
            }`}
          >
            {asset?.type === 'home' ? 'Rooms & Gear' : 'Systems & Parts'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3.5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
              activeTab === 'history' ? 'bg-[#7C3AED] text-white shadow-lg shadow-purple-200' : 'text-slate-400'
            }`}
          >
            Full History
          </button>
        </div>

        {/* Tab 1: Layout Section */}
        {activeTab === 'systems' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Layout</h3>
              <button onClick={() => setIsSpaceModalOpen(true)} className="text-[#7C3AED] text-[10px] font-black bg-white px-5 py-2.5 rounded-full shadow-lg shadow-purple-100 uppercase tracking-widest active:scale-95 transition-all">
                {asset?.type === 'home' ? '+ Add Space' : '+ Add System'}
              </button>
            </div>
            {spaces.map((space) => (
              <div key={space.id} className="bg-white rounded-[2.8rem] p-7 shadow-xl shadow-purple-50/50 border border-white">
                <div className="flex justify-between items-center mb-5 border-b border-slate-50 pb-3 text-slate-900">
                  <h4 className="font-black uppercase text-[10px] tracking-[0.2em]">{space.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteSpace(space.id)} className="text-slate-300 hover:text-red-400">🗑️</button>
                    <button onClick={() => { setSelectedSpaceId(space.id); setIsEqModalOpen(true); }} className="text-[9px] font-black bg-[#F5F3FF] text-[#7C3AED] px-3 py-1.5 rounded-xl uppercase tracking-widest">+ Item</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {space.equipments?.map((eq: any) => (
                    <div key={eq.id} className="flex items-center gap-2 group">
                      <Link href={`/equipment/${eq.id}`} className="flex-1">
                        <div className="bg-[#F8F7FF] rounded-2xl p-4 flex justify-between items-center border border-transparent group-hover:border-purple-100 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm text-slate-800">
                              {asset?.type === 'home' ? '🏠' : '⚙️'}
                            </div>
                            <div className="text-slate-900">
                              <p className="text-sm font-bold">{eq.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{eq.brand || 'General'}</p>
                            </div>
                          </div>
                          <span className="text-slate-300">❯</span>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => handleDeleteEquipment(e, eq.id, eq.name)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-300 hover:text-red-500 hover:bg-red-100 transition-all text-sm flex-shrink-0"
                      >🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Full History Section */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-lg font-bold text-slate-800 italic underline decoration-purple-200 underline-offset-8">
                Records ({allLogs.length})
              </h3>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spent</p>
                <p className="text-xl font-black text-[#7C3AED]">
                  ฿{allLogs.reduce((sum, log) => sum + log.cost, 0).toLocaleString()}
                </p>
              </div>
            </div>

            {allLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-purple-50/50 border border-white relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-[#F5F3FF] text-[#7C3AED] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-purple-100">
                    {log.equipments?.spaces?.name}
                  </span>
                  <span className="text-slate-300 text-xs">❯</span>
                  <span className="text-slate-700 text-[10px] font-bold uppercase tracking-tighter">
                    {log.equipments?.name}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-bold text-slate-800 text-lg leading-tight flex-1 pr-4">{log.detail}</h4>
                  <p className="font-black text-[#7C3AED] text-lg">฿{log.cost.toLocaleString()}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(log.service_date).toLocaleDateString('th-TH')}
                  </p>
                  {log.next_service_date && (
                    <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] animate-pulse">⏳</span>
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-tighter">
                        Next: {new Date(log.next_service_date).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="absolute -right-2 -bottom-2 text-6xl opacity-[0.03] grayscale pointer-events-none">
                  {asset?.type === 'home' ? '🏠' : '⚙️'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Dynamic Modals --- */}
      {(isSpaceModalOpen || isEqModalOpen) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 text-slate-900">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-6 text-center italic uppercase tracking-tighter">
              {isSpaceModalOpen ? (asset?.type === 'home' ? 'New Room' : 'New System') : (asset?.type === 'home' ? 'New Equipment' : 'New Part')}
            </h3>
            
            <div className="space-y-4">
              {isSpaceModalOpen ? (
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{asset?.type === 'home' ? 'Room Name' : 'System Name'}</label>
                   <input 
                    className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-bold border-2 border-transparent focus:border-purple-200 transition-all"
                    placeholder={asset?.type === 'home' ? "เช่น ห้องนั่งเล่น" : "เช่น ระบบเครื่องยนต์"}
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label>
                  <input
                    className="w-full bg-[#F5F3FF] rounded-2xl p-4 outline-none font-bold border-2 border-transparent focus:border-purple-200 transition-all"
                    placeholder={asset?.type === 'home' ? "เช่น แอร์, ทีวี" : "เช่น น้ำมันเครื่อง, ยาง"}
                    value={newEqName}
                    onChange={e => setNewEqName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-8">
              <button onClick={() => {setIsSpaceModalOpen(false); setIsEqModalOpen(false)}} className="flex-1 py-4 text-slate-400 font-bold text-sm">Cancel</button>
              <button 
                onClick={isSpaceModalOpen ? handleAddSpace : handleAddEquipment}
                className="flex-1 py-4 bg-[#7C3AED] text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-100"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}