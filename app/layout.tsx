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
  title: 'KuBaan',
  description: 'คู่บ้าน ดูแลทุกเรื่องบ้านและรถ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KuBaan',
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B2F5E',
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
