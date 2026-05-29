import { Prompt } from 'next/font/google'
import './globals.css'
import { FeedbackProvider } from './components/Feedback'

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin', 'thai'],
  variable: '--font-prompt'
})

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
