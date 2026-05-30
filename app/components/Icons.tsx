// ชุด SVG line-icon กลาง สไตล์เดียวกับ BottomNav/PageHeader
// ใช้ stroke="currentColor" เพื่อรับสีจาก text-* ของ parent

interface IconProps {
  className?: string
  strokeWidth?: number
}

const base = (props: IconProps) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: props.strokeWidth ?? 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: props.className ?? 'w-5 h-5',
})

export function HomeIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

export function CarIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 17H4a1 1 0 0 1-1-1v-3.3a2 2 0 0 1 .15-.77l1.7-4.1A2 2 0 0 1 6.7 6.5h10.6a2 2 0 0 1 1.85 1.23l1.7 4.1a2 2 0 0 1 .15.77V16a1 1 0 0 1-1 1h-1" />
      <path d="M9 17h6" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

export function MotorcycleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="5.5" cy="16.5" r="3.5" />
      <circle cx="18.5" cy="16.5" r="3.5" />
      <path d="M5.5 16.5 9 10h4.5l2 3h3" />
      <path d="M14.5 7.5H17l1 3" />
      <path d="M8 10h5" />
    </svg>
  )
}

export function WrenchIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

export function TrashIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function XIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function LogOutIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function CameraIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function ClockIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export function InboxIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

export function BellIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// Helper: เลือก icon ตามประเภททรัพย์สิน
export function AssetIcon({ type, vehicleType, className, strokeWidth }: IconProps & { type?: string; vehicleType?: string }) {
  if (type === 'home') return <HomeIcon className={className} strokeWidth={strokeWidth} />
  if (vehicleType === 'มอเตอร์ไซค์') return <MotorcycleIcon className={className} strokeWidth={strokeWidth} />
  return <CarIcon className={className} strokeWidth={strokeWidth} />
}
