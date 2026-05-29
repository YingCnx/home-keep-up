import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

const MAX_SIZE_MB = 1
const MAX_WIDTH_PX = 1200
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export async function uploadImage(
  file: File,
  bucket: 'assets' | 'receipts',
  path: string // e.g. "asset-id.jpg" or "equipment-id/timestamp.jpg"
): Promise<string | null> {

  // 1. ตรวจสอบประเภทไฟล์
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    alert('ไฟล์ต้องเป็นรูปภาพ (JPG, PNG, WEBP) เท่านั้น')
    return null
  }

  // 2. ตรวจสอบขนาดก่อน compress (ไม่เกิน 20MB)
  if (file.size > 20 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (สูงสุด 20MB)')
    return null
  }

  // 3. Compress รูป
  let compressedFile: File
  try {
    compressedFile = await imageCompression(file, {
      maxSizeMB: MAX_SIZE_MB,
      maxWidthOrHeight: MAX_WIDTH_PX,
      useWebWorker: true,
      fileType: 'image/webp', // แปลงเป็น webp ประหยัดพื้นที่ที่สุด
    })
  } catch {
    compressedFile = file // ถ้า compress ไม่ได้ใช้ต้นฉบับ
  }

  // 4. Upload
  const filePath = path.replace(/\.[^/.]+$/, '') + '.webp' // บังคับ .webp
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile, { upsert: true, contentType: 'image/webp' })

  if (error) {
    console.error('Upload error:', error.message)
    alert(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`)
    return null
  }

  // 5. คืน signed URL อายุ 10 ปี (private bucket)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

  if (signedError || !signedData) {
    // fallback: public URL (กรณี bucket ยังเป็น public)
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return publicUrl
  }

  return signedData.signedUrl
}
