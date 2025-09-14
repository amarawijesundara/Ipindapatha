import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'
import { LanguageProvider } from '@/components/LanguageContext'
import { ContentProvider } from '@/components/ContentContext'
import ConditionalHeader from '@/components/ConditionalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'JWT Auth App - Next.js',
  description: 'Full-stack JWT authentication application with Next.js and PostgreSQL',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <ContentProvider>
            <AuthProvider>
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <ConditionalHeader />
              <main id="main-content" className="main-content">
                {children}
              </main>
            </AuthProvider>
          </ContentProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}