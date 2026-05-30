import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ป้องกันไม่ให้แอพถูก embed ใน iframe (Clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // ป้องกัน browser ตีความ content-type ผิด
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // ลด referrer info ที่ส่งออกไป
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // จำกัด browser features ที่ไม่ได้ใช้
          { key: 'Permissions-Policy', value: 'camera=self, microphone=(), geolocation=()' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
};

export default nextConfig;
