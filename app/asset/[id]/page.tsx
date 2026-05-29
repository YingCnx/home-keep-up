'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '../../components/BottomNav'

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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 font-sans pb-24 text-slate-900">

      {/* Header */}
      <div className="bg-blue-600 px-6 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500 rounded-full opacity-50" />
        <div className="flex justify-between items-center relative z-10 mb-4">
          <button onClick={() => router.push('/')} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl active:scale-90 transition-all">←</button>
          <Link href={`/edit-asset/${id}`} className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white text-sm active:scale-90 transition-all">✎</Link>
        </div>
        <div className="relative z-10">
          {asset?.image_url && (
            <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 border-2 border-white/30">
              <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
            </div>
          )}
          <h1 className="text-white text-2xl font-bold">{asset?.name}</h1>
          <p className="text-blue-200 text-sm">{asset?.asset_number || 'No ID'}</p>
        </div>
      </div>

      <div className="px-5 -mt-6">
        {/* Stats Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">ราคาซื้อ</p>
              <p className="text-slate-800 font-bold text-sm">฿{asset?.purchase_price?.toLocaleString() || '-'}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">{asset?.type === 'home' ? 'พื้นที่' : 'เลขไมล์'}</p>
              <p className="text-slate-800 font-bold text-sm">
                {asset?.type === 'home' ? (asset?.area_size || '-') : ((asset?.mileage_at_purchase?.toLocaleString() || '-') + ' km')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setActiveTab('systems')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'systems' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            {asset?.type === 'home' ? 'Rooms & Gear' : 'Systems & Parts'}
          </button>
          <button onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            Full History
          </button>
        </div>

        {/* Tab 1: Systems */}
        {activeTab === 'systems' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-800 font-bold text-base">Layout</h3>
              <button onClick={() => setIsSpaceModalOpen(true)} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-all">
                {asset?.type === 'home' ? '+ Add Space' : '+ Add System'}
              </button>
            </div>
            {spaces.map(space => (
              <div key={space.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                  <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{space.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteSpace(space.id)} className="text-slate-300 hover:text-red-400 text-sm">🗑️</button>
                    <button onClick={() => { setSelectedSpaceId(space.id); setIsEqModalOpen(true) }}
                      className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl">+ Item</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {space.equipments?.map((eq: any) => (
                    <div key={eq.id} className="flex items-center gap-2">
                      <Link href={`/equipment/${eq.id}`} className="flex-1">
                        <div className="bg-slate-50 rounded-2xl p-3.5 flex justify-between items-center border border-slate-100 active:bg-slate-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">
                              {asset?.type === 'home' ? '🏠' : '⚙️'}
                            </div>
                            <div>
                              <p className="text-slate-800 font-bold text-sm">{eq.name}</p>
                              <p className="text-slate-400 text-[11px]">{eq.brand || 'General'}</p>
                            </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      </Link>
                      <button onClick={(e) => handleDeleteEquipment(e, eq.id, eq.name)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-300 hover:text-red-500 transition-all text-sm flex-shrink-0">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-slate-800 font-bold text-base">Records ({allLogs.length})</h3>
              <p className="text-blue-600 font-bold text-sm">฿{allLogs.reduce((sum, log) => sum + log.cost, 0).toLocaleString()}</p>
            </div>
            {allLogs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-lg">{log.equipments?.spaces?.name}</span>
                  <span className="text-slate-300 text-xs">›</span>
                  <span className="text-slate-600 text-[11px] font-medium">{log.equipments?.name}</span>
                </div>
                <div className="flex justify-between items-start mb-3">
                  <p className="text-slate-800 font-bold text-sm flex-1 pr-3">{log.detail}</p>
                  <p className="text-blue-600 font-bold text-sm">฿{log.cost.toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <p className="text-slate-400 text-[11px]">{new Date(log.service_date).toLocaleDateString('th-TH')}</p>
                  {log.next_service_date && (
                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                      <span className="text-[10px]">⏳</span>
                      <p className="text-amber-500 text-[11px] font-bold">Next: {new Date(log.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(isSpaceModalOpen || isEqModalOpen) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-slate-800 font-bold text-lg mb-5">
              {isSpaceModalOpen ? (asset?.type === 'home' ? 'New Room' : 'New System') : (asset?.type === 'home' ? 'New Equipment' : 'New Part')}
            </h3>
            <div>
              {isSpaceModalOpen ? (
                <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-medium border-2 border-transparent focus:border-blue-200 transition-all text-slate-800"
                  placeholder={asset?.type === 'home' ? "เช่น ห้องนั่งเล่น" : "เช่น ระบบเครื่องยนต์"}
                  value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} autoFocus />
              ) : (
                <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-medium border-2 border-transparent focus:border-blue-200 transition-all text-slate-800"
                  placeholder={asset?.type === 'home' ? "เช่น แอร์, ทีวี" : "เช่น น้ำมันเครื่อง, ยาง"}
                  value={newEqName} onChange={e => setNewEqName(e.target.value)} autoFocus />
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setIsSpaceModalOpen(false); setIsEqModalOpen(false) }} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">Cancel</button>
              <button onClick={isSpaceModalOpen ? handleAddSpace : handleAddEquipment}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}