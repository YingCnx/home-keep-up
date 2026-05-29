'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useFeedback } from '../../../components/Feedback'

export default function ExportPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useFeedback()
  const printRef = useRef<HTMLDivElement>(null)
  const [asset, setAsset] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: assetData } = await supabase.from('assets').select('*').eq('id', id).single()
      const { data: logsData } = await supabase
        .from('maintenance_logs')
        .select('*, equipments(name, brand, spaces(name))')
        .eq('equipments.spaces.asset_id', id)
        .order('service_date', { ascending: false })

      // ดึง logs ผ่าน equipment ใน asset นี้
      const { data: equipData } = await supabase
        .from('equipments')
        .select('id, name, spaces!inner(asset_id)')
        .eq('spaces.asset_id', id)

      const equipIds = equipData?.map(e => e.id) || []
      const { data: allLogs } = await supabase
        .from('maintenance_logs')
        .select('*, equipments(name, spaces(name))')
        .in('equipment_id', equipIds)
        .order('service_date', { ascending: false })

      setAsset(assetData)
      setLogs(allLogs || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleExport = async () => {
    if (!printRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jspdfModule = await import('jspdf')
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        onclone: (doc) => {
          // แทนที่รูปที่โหลดไม่ได้ด้วยพื้นหลังสีเทา
          doc.querySelectorAll('img').forEach((img: HTMLImageElement) => {
            img.crossOrigin = 'anonymous'
          })
        }
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageWidth = 210
      const pageHeight = 297
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${asset?.name || 'asset'}-history.pdf`)
    } catch (err) {
      console.error('Export error:', err)
      toast('Export ไม่สำเร็จ: ' + (err as any)?.message, 'error')
    }
    setExporting(false)
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0)
  const assetEmoji = asset?.type === 'home' ? '🏠' : asset?.vehicle_type === 'มอเตอร์ไซค์' ? '🏍️' : '🚗'
  const assetTypeLabel = asset?.type === 'home' ? 'บ้าน' : asset?.vehicle_type || 'รถ'

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* Action Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-5 h-14 flex items-center justify-between">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-slate-50 transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-slate-800 font-bold text-base">Export PDF</h1>
        <button onClick={handleExport} disabled={exporting}
          className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all disabled:opacity-60 flex items-center gap-1.5">
          {exporting ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลัง Export...
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export PDF
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="p-5 flex justify-center">
        <div ref={printRef} className="bg-white w-full max-w-2xl shadow-sm" style={{fontFamily: 'sans-serif'}}>

          {/* Header */}
          <div className="bg-blue-600 p-8 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-1">รายงานประวัติการบำรุงรักษา</p>
                <h1 className="text-3xl font-bold">{asset?.name}</h1>
                <p className="text-blue-200 text-sm mt-1">{assetTypeLabel} {asset?.asset_number ? `· ${asset.asset_number}` : ''}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                {asset?.image_url
                  ? <img src={asset.image_url} className="w-full h-full object-cover rounded-2xl" alt={asset.name} />
                  : assetEmoji
                }
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-blue-200 text-xs mt-0.5">รายการทั้งหมด</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold">฿{totalCost >= 1000 ? (totalCost/1000).toFixed(1)+'k' : totalCost.toLocaleString()}</p>
                <p className="text-blue-200 text-xs mt-0.5">ค่าใช้จ่ายรวม</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold">฿{asset?.purchase_price?.toLocaleString() || '0'}</p>
                <p className="text-blue-200 text-xs mt-0.5">ราคาซื้อ</p>
              </div>
            </div>
          </div>

          {/* Generated Date */}
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Home Keep Up" className="w-6 h-6 object-contain" />
              <span className="text-slate-500 text-xs font-medium">Home Keep Up</span>
            </div>
            <p className="text-slate-400 text-xs">
              สร้างเมื่อ: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Log List */}
          <div className="px-8 py-6">
            <h2 className="text-slate-800 font-bold text-base mb-4">ประวัติการบำรุงรักษา</h2>

            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-3xl mb-2">📋</p>
                <p>ยังไม่มีประวัติการบำรุงรักษา</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, index) => (
                  <div key={log.id} className="border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* No. */}
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 text-xs font-bold">{logs.length - index}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-800 font-bold text-sm">{log.detail}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {log.equipments?.spaces?.name && (
                              <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-0.5 rounded-lg border border-slate-100">
                                {log.equipments.spaces.name}
                              </span>
                            )}
                            {log.equipments?.name && (
                              <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-0.5 rounded-lg border border-slate-100">
                                {log.equipments.name}
                              </span>
                            )}
                            {log.brand && (
                              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-blue-100">
                                {log.brand}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-blue-600 font-bold text-sm">฿{(log.cost || 0).toLocaleString()}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          {new Date(log.service_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {log.image_url && (
                      <img src={log.image_url} alt="receipt" className="w-full h-28 object-cover rounded-xl mt-3 border border-slate-100" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
              <p className="text-slate-600 font-bold">ค่าใช้จ่ายรวมทั้งหมด</p>
              <p className="text-blue-600 font-bold text-xl">฿{totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-slate-400 text-xs text-center">
              เอกสารนี้สร้างโดย Home Keep Up · Every Maintenance Matters
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
