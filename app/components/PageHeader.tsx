'use client'

import { useRouter } from 'next/navigation'

interface Props {
  title: string
  backHref?: string
  rightElement?: React.ReactNode
}

export default function PageHeader({ title, backHref, rightElement }: Props) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
      <div className="flex items-center justify-between px-5 h-14">
        <button
          onClick={() => backHref ? router.push(backHref) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-slate-50 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-slate-800 font-bold text-base">{title}</h1>
        <div className="w-9 h-9 flex items-center justify-center">
          {rightElement || null}
        </div>
      </div>
    </div>
  )
}
