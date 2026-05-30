import { Prompt } from 'next/font/google'
import './globals.css'
import { FeedbackProvider } from './components/Feedback'
import type { Metadata, Viewport } from 'next'

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin', 'thai'],
  variable: '--font-prompt'
})

export const metadata: Metadata = {
  title: 'Home Keep Up',
  description: 'บันทึกและติดตามการบำรุงรักษาบ้านและรถ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Home Keep Up',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${prompt.variable} font-sans`}>
        <FeedbackProvider>
          {children}
        </FeedbackProvider>
      </body>
    </html>
  )
}
