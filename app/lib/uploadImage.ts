import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

const MAX_SIZE_MB = 1
const MAX_WIDTH_PX = 1200
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// throw Error แทน alert() — ให้ caller จัดการแสดง toast เอง
export async function uploadImage(
  file: File,
  bucket: 'assets' | 'receipts',
  path: string
): Promise<string | null> {

  // 1. ตรวจสอบประเภทไฟล์
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพ (JPG, PNG, WEBP) เท่านั้น')
  }

  // 2. ตรวจสอบขนาดก่อน compress (ไม่เกิน 20MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 20MB)')
  }

  // 3. Compress รูป
  let compressedFile: File
  try {
    compressedFile = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_PX,
      useWebWorker: true,
      fileType: 'image/webp',
    })
  } catch {
    compressedFile = file
  }

  // 4. Upload
  const filePath = path.replace(/\.[^/.]+$/, '') + '.webp'
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile, { upsert: true, contentType: 'image/webp' })

  if (error) {
    throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`)
  }

  // 5. คืน signed URL อายุ 1 ปี (ลดจาก 10 ปี เพื่อความปลอดภัย)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365)

  if (signedError || !signedData) {
    // fallback: public URL (กรณี bucket เป็น public)
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return publicUrl
  }

  return signedData.signedUrl
}
