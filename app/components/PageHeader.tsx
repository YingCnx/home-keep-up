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
    <div className="sticky top-0 z-20">
      {/* Blue status-bar area */}
      <div className="bg-blue-600 pt-12 pb-5 px-5 flex items-end justify-between">
        <button
          onClick={() => backHref ? router.push(backHref) : router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 active:bg-white/30 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <h1 className="text-white font-bold text-lg truncate max-w-[180px] text-center">{title}</h1>

        <div className="flex items-center justify-end gap-1 min-w-9">
          {rightElement || <div className="w-9 h-9" />}
        </div>
      </div>

      {/* White rounded bottom edge */}
      <div className="bg-blue-600">
        <div className="bg-white h-5 rounded-t-3xl" />
      </div>
    </div>
  )
}
