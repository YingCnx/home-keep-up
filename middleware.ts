import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes ที่ไม่ต้อง login
const PUBLIC_ROUTES = ['/login', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // อนุญาต public routes ผ่านได้เลย
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ถ้าไม่ได้ login → redirect ไป /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // ตรวจเฉพาะ page routes — ข้าม static files, images, manifest, sw.js ทั้งหมด
  matcher: [
    '/((?!_next/static|_next/image|_next/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|js|json|woff|woff2|ttf)$).*)',
  ],
}
