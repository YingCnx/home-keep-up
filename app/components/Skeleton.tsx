// Skeleton loading components — ใช้แทน spinner ระหว่างโหลดข้อมูล

interface SkeletonProps {
  className?: string
}

// Block พื้นฐาน
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  )
}

// Card ทรัพย์สิน (dashboard)
export function AssetCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="w-14 h-14 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="w-12 h-6" />
      </div>
      <div className="flex border-t border-slate-50">
        <Skeleton className="flex-1 h-9 rounded-none" />
        <Skeleton className="flex-1 h-9 rounded-none" />
      </div>
    </div>
  )
}

// Banner card (dashboard)
export function BannerSkeleton() {
  return <Skeleton className="h-36 w-full mb-5" />
}

// Stats grid (reminders)
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  )
}

// Reminder card
export function ReminderCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="w-12 h-6" />
      </div>
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

// Log card (equipment timeline)
export function LogCardSkeleton() {
  return (
    <div className="relative pl-10">
      <div className="absolute left-[17px] top-4 w-2.5 h-2.5 bg-slate-200 rounded-full" />
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4 mt-2" />
      </div>
    </div>
  )
}

// Space card (asset detail)
export function SpaceCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
      <Skeleton className="h-4 w-1/3 mb-4" />
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  )
}
