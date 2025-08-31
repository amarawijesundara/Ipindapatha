import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthContext'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'JWT Auth App - Next.js',
  description: 'Full-stack JWT authentication application with Next.js and PostgreSQL',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <div className="app-container">
            <Header />
            <main id="main-content" className="main-content">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}