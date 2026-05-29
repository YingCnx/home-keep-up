import { Sarabun } from 'next/font/google'
import './globals.css'

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin', 'thai'],
  variable: '--font-sarabun'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
