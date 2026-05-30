'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '../../components/BottomNav'
import PageHeader from '../../components/PageHeader'
import { useFeedback } from '../../components/Feedback'
import { AssetIcon, HomeIcon, WrenchIcon, TrashIcon, ClockIcon, GaugeIcon } from '../../components/Icons'
import { SpaceCardSkeleton } from '../../components/Skeleton'

export default function AssetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { confirm, toast } = useFeedback()
  const [asset, setAsset] = useState<any>(null)
  const [spaces, setSpaces] = useState<any[]>([])
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'systems' | 'mileage' | 'history'>('systems')
  const [eqSearch, setEqSearch] = useState('')
  const [mileageLogs, setMileageLogs] = useState<any[]>([])
  const [isMileageModalOpen, setIsMileageModalOpen] = useState(false)
  const [newMileage, setNewMileage] = useState('')
  const [mileageDate, setMileageDate] = useState(new Date().toISOString().split('T')[0])
  const [mileageNote, setMileageNote] = useState('')
  const [savingMileage, setSavingMileage] = useState(false)

  // --- Modal States ---
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [isEqModalOpen, setIsEqModalOpen] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const [newEqName, setNewEqName] = useState('')
  const [newEqBrand, setNewEqBrand] = useState('')

  const fetchData = async () => {
  const { data: assetData } = await supabase.from('assets').select('*').eq('id', id).single()
  const { data: spacesData } = await supabase.from('spaces').select('*, equipments(*)').eq('asset_id', id)
  const { data: logsData } = await supabase
    .from('maintenance_logs')
    .select(`*, equipments!inner(name, spaces!inner(name, asset_id))`)
    .eq('equipments.spaces.asset_id', id)
    .order('service_date', { ascending: false })

  setAsset(assetData)
  setSpaces(spacesData || [])
  setAllLogs(logsData || [])

  if (assetData?.type === 'vehicle') {
    const { data: mileageData } = await supabase
      .from('mileage_logs')
      .select('*')
      .eq('asset_id', id)
      .order('recorded_at', { ascending: false })
    setMileageLogs(mileageData || [])
  }

  setLoading(false)
}

  useEffect(() => { fetchData() }, [id])

  const handleAddSpace = async () => {
    if (!newSpaceName) return
    const { error } = await supabase.from('spaces').insert([{ name: newSpaceName, asset_id: id }])
    if (error) toast(error.message, 'error')
    else { setNewSpaceName(''); setIsSpaceModalOpen(false); fetchData(); }
  }

  const handleAddEquipment = async () => {
    if (!newEqName || !selectedSpaceId) return
    const { error } = await supabase.from('equipments').insert([{ 
      name: newEqName, brand: newEqBrand, space_id: selectedSpaceId 
    }])
    if (error) toast(error.message, 'error')
    else { setNewEqName(''); setNewEqBrand(''); setIsEqModalOpen(false); fetchData(); }
  }

  const handleAddMileage = async () => {
    if (!newMileage) return toast('กรุณาระบุเลขไมล์', 'error')
    const val = parseInt(newMileage)
    if (isNaN(val) || val < 0) return toast('เลขไมล์ไม่ถูกต้อง', 'error')
    const latest = mileageLogs[0]
    if (latest && val < latest.mileage) {
      if (!await confirm({ title: 'เลขไมล์น้อยกว่าครั้งก่อน?', message: `ครั้งก่อนบันทึกไว้ ${latest.mileage.toLocaleString()} km`, confirmText: 'บันทึกต่อ' })) return
    }
    setSavingMileage(true)
    const { error } = await supabase.from('mileage_logs').insert([{
      asset_id: id, mileage: val, recorded_at: mileageDate, note: mileageNote || null
    }])
    if (error) toast(error.message, 'error')
    else {
      toast('บันทึกเลขไมล์แล้ว', 'success')
      setIsMileageModalOpen(false)
      setNewMileage(''); setMileageNote(''); setMileageDate(new Date().toISOString().split('T')[0])
      fetchData()
    }
    setSavingMileage(false)
  }

  const handleDeleteMileage = async (logId: string) => {
    if (!await confirm({ title: 'ลบรายการนี้?', confirmText: 'ลบ', danger: true })) return
    const { error } = await supabase.from('mileage_logs').delete().eq('id', logId)
    if (error) toast(error.message, 'error')
    else { toast('ลบแล้ว', 'success'); fetchData() }
  }

  const handleDeleteSpace = async (spaceId: string) => {
    const space = spaces.find(s => s.id === spaceId)
    const eqCount = space?.equipments?.length || 0
    const msg = eqCount > 0
      ? `มีอุปกรณ์อยู่ ${eqCount} รายการ ทั้งหมดรวมถึงประวัติจะหายไปด้วย`
      : 'พื้นที่นี้จะถูกลบออก'
    if (!await confirm({ title: 'ลบพื้นที่นี้?', message: msg, confirmText: 'ลบ', danger: true })) return
    const { error } = await supabase.from('spaces').delete().eq('id', spaceId)
    if (error) toast(error.message, 'error')
    else { toast('ลบแล้ว', 'success'); fetchData() }
  }

  const handleDeleteEquipment = async (e: React.MouseEvent, eqId: string, eqName: string) => {
    e.preventDefault()
    if (!await confirm({ title: `ลบ "${eqName}"?`, message: 'ประวัติทั้งหมดจะหายไปด้วย', confirmText: 'ลบ', danger: true })) return
    const { error } = await supabase.from('equipments').delete().eq('id', eqId)
    if (error) toast(error.message, 'error')
    else { toast('ลบแล้ว', 'success'); fetchData() }
  }

  if (loading) return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-24">
      <div className="h-14 bg-blue-600 mb-4" />
      <div className="mx-5 mb-5 h-24 bg-blue-50 rounded-3xl animate-pulse" />
      <div className="px-5">
        <div className="flex gap-2 mb-5">
          <div className="flex-1 h-9 bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex-1 h-9 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4">
          <SpaceCardSkeleton />
          <SpaceCardSkeleton />
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white font-sans pb-24 text-slate-900">

      <PageHeader title={asset?.name || 'รายการ'} backHref="/"
        rightElement={
          <div className="flex items-center gap-2">
            <Link href={`/asset/${id}/export`} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </Link>
            <Link href={`/edit-asset/${id}`} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
          </div>
        }
      />

      {/* Asset Info Banner */}
      <div className="mx-5 mt-4 mb-5 bg-blue-50 rounded-3xl p-4 flex items-center gap-4 border border-blue-100">
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-white border border-blue-100">
          {asset?.image_url
            ? <img src={asset.image_url} className="w-full h-full object-cover" alt={asset.name} />
            : <div className="w-full h-full flex items-center justify-center text-blue-500">
                <AssetIcon type={asset?.type} vehicleType={asset?.vehicle_type} className="w-7 h-7" />
              </div>
          }
        </div>
        <div>
          <p className="text-slate-500 text-xs">{asset?.asset_number || 'ไม่มีเลขทะเบียน'}</p>
          <p className="text-blue-600 font-bold text-base mt-0.5">฿{asset?.purchase_price?.toLocaleString() || '0'}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            {asset?.type === 'home' ? (asset?.area_size || '-') : ((asset?.mileage_at_purchase?.toLocaleString() || '-') + ' km')}
          </p>
        </div>
      </div>

      <div className="px-5">
        {/* Stats Card */}

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setActiveTab('systems')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'systems' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            {asset?.type === 'home' ? 'ห้องและอุปกรณ์' : 'ระบบและชิ้นส่วน'}
          </button>
          {asset?.type === 'vehicle' && (
            <button onClick={() => setActiveTab('mileage')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'mileage' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
              ไมล์
            </button>
          )}
          <button onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
            ประวัติ
          </button>
        </div>

        {/* Tab 1: Systems */}
        {activeTab === 'systems' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-800 font-bold text-base">โครงสร้าง</h3>
              <button onClick={() => setIsSpaceModalOpen(true)} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-all">
                {asset?.type === 'home' ? '+ เพิ่มพื้นที่' : '+ เพิ่มระบบ'}
              </button>
            </div>

            {/* ค้นหาอุปกรณ์ */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={eqSearch}
                onChange={e => setEqSearch(e.target.value)}
                placeholder="ค้นหาอุปกรณ์..."
                className="w-full bg-slate-50 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-slate-700 border-2 border-transparent focus:border-blue-300 outline-none transition-all"
              />
              {eqSearch && (
                <button onClick={() => setEqSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            {spaces.map(space => {
              const filteredEq = (space.equipments || []).filter((eq: any) =>
                eq.name.toLowerCase().includes(eqSearch.toLowerCase()) ||
                (eq.brand || '').toLowerCase().includes(eqSearch.toLowerCase())
              )
              if (eqSearch && filteredEq.length === 0) return null
              return (
              <div key={space.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                  <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{space.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteSpace(space.id)} className="text-slate-300 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                    <button onClick={() => { setSelectedSpaceId(space.id); setIsEqModalOpen(true) }}
                      className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl">+ เพิ่ม</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredEq.map((eq: any) => (
                    <div key={eq.id} className="flex items-center gap-2">
                      <Link href={`/equipment/${eq.id}`} className="flex-1">
                        <div className="bg-slate-50 rounded-2xl p-3.5 flex justify-between items-center border border-slate-100 active:bg-slate-100 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
                              {asset?.type === 'home' ? <HomeIcon className="w-5 h-5" /> : <WrenchIcon className="w-5 h-5" />}
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
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-300 hover:text-red-500 transition-all flex-shrink-0"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Tab: Mileage */}
        {activeTab === 'mileage' && (
          <div className="space-y-4">
            {/* Summary card */}
            {mileageLogs.length > 0 ? (
              <div className="bg-blue-600 rounded-3xl p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <GaugeIcon className="w-4 h-4 text-blue-200" />
                  <p className="text-blue-200 text-xs font-medium">เลขไมล์ล่าสุด</p>
                </div>
                <p className="text-3xl font-bold">{mileageLogs[0].mileage.toLocaleString()} <span className="text-xl font-medium">km</span></p>
                <p className="text-blue-200 text-xs mt-1">{new Date(mileageLogs[0].recorded_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {mileageLogs.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-white/20 flex justify-between text-xs">
                    <span className="text-blue-200">ระยะตั้งแต่ครั้งก่อน</span>
                    <span className="font-bold text-white">+{(mileageLogs[0].mileage - mileageLogs[1].mileage).toLocaleString()} km</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50 rounded-3xl p-6 text-center border border-blue-100">
                <GaugeIcon className="w-10 h-10 text-blue-300 mx-auto mb-2" />
                <p className="text-slate-500 font-bold text-sm">ยังไม่มีข้อมูลเลขไมล์</p>
                <p className="text-slate-400 text-xs mt-1">บันทึกเลขไมล์เพื่อติดตามการใช้งาน</p>
              </div>
            )}

            <button onClick={() => setIsMileageModalOpen(true)}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              บันทึกเลขไมล์
            </button>

            {/* History list */}
            {mileageLogs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest ml-1">ประวัติไมล์</h4>
                {mileageLogs.map((log, i) => {
                  const prev = mileageLogs[i + 1]
                  const diff = prev ? log.mileage - prev.mileage : null
                  return (
                    <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <GaugeIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 font-bold text-sm">{log.mileage.toLocaleString()} km</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-slate-400 text-[11px]">{new Date(log.recorded_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          {diff !== null && diff >= 0 && <span className="text-green-500 text-[11px] font-bold">+{diff.toLocaleString()} km</span>}
                        </div>
                        {log.note && <p className="text-slate-400 text-[11px] mt-0.5 italic">{log.note}</p>}
                      </div>
                      <button onClick={() => handleDeleteMileage(log.id)} className="text-slate-200 hover:text-red-400 transition-all">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-slate-800 font-bold text-base">ประวัติ ({allLogs.length})</h3>
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
                      <ClockIcon className="w-3 h-3 text-amber-500" />
                      <p className="text-amber-500 text-[11px] font-bold">ครั้งต่อไป: {new Date(log.next_service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</p>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4 pb-28 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-slate-800 font-bold text-lg mb-5">
              {isSpaceModalOpen ? (asset?.type === 'home' ? 'เพิ่มห้อง' : 'เพิ่มระบบ') : (asset?.type === 'home' ? 'เพิ่มอุปกรณ์' : 'เพิ่มชิ้นส่วน')}
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
              <button onClick={() => { setIsSpaceModalOpen(false); setIsEqModalOpen(false) }} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={isSpaceModalOpen ? handleAddSpace : handleAddEquipment}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Mileage */}
      {isMileageModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4 pb-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-slate-800 font-bold text-lg mb-5">บันทึกเลขไมล์</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">เลขไมล์ (km)</label>
                <input type="number" autoFocus
                  className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-bold text-slate-700 text-2xl"
                  value={newMileage} onChange={e => setNewMileage(e.target.value)} placeholder="0" />
                {mileageLogs[0] && <p className="text-slate-400 text-xs mt-1.5 ml-1">ครั้งก่อน: {mileageLogs[0].mileage.toLocaleString()} km</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">วันที่บันทึก</label>
                <input type="date"
                  className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"
                  value={mileageDate} onChange={e => setMileageDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">หมายเหตุ <span className="normal-case font-medium opacity-50">(ถ้ามี)</span></label>
                <input
                  className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 outline-none border-2 border-transparent focus:border-blue-300 transition-all font-medium text-slate-700 text-sm"
                  value={mileageNote} onChange={e => setMileageNote(e.target.value)} placeholder="เช่น ก่อนเซอร์วิส, ทริปต่างจังหวัด" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setIsMileageModalOpen(false)} className="flex-1 py-3.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
              <button onClick={handleAddMileage} disabled={savingMileage}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-md disabled:opacity-60">
                {savingMileage ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}