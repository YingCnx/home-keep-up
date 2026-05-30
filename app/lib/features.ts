/**
 * Feature Flags — เปิด/ปิด feature โดยไม่ต้อง redeploy
 *
 * วิธีใช้:
 *   import { FEATURES } from '@/app/lib/features'
 *   {FEATURES.community && <CommunitySection />}
 *
 * เปิด feature: เปลี่ยน false → true แล้ว deploy
 */

export const FEATURES = {
  // ── ใช้งานได้แล้ว ──────────────────────────────
  mileage_tracking: true,       // บันทึกเลขไมล์ (รถ)
  export_pdf: true,             // Export ประวัติเป็น PDF
  search: true,                 // ค้นหารายการ / อุปกรณ์
  push_notification: true,      // ขอ permission แจ้งเตือนผ่าน browser

  // ── รอเปิดตัว ───────────────────────────────────
  tips: false,                  // Tip of the day — ความรู้ดูแลบ้านและรถ
  export_csv: false,            // Export ข้อมูลเป็น CSV
  share_asset: false,           // แชร์รายการกับผู้ใช้คนอื่น

  // ── Community (Phase 2) ─────────────────────────
  community: false,             // แท็บ Community ใน Bottom Nav
  community_tips: false,        // โพส tips / วิธีดูแล จาก user
  community_recommend: false,   // แนะนำช่าง / ร้านซ่อม
  community_qa: false,          // ถาม-ตอบ ปัญหาบ้านและรถ

  // ── Marketplace (Phase 3) ───────────────────────
  marketplace: false,           // ตลาด — ช่างรับงาน / โฆษณา relevant
} as const

export type FeatureKey = keyof typeof FEATURES
