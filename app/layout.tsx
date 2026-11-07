import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SanctuaryProvider } from '@/context/sanctuary-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'LUMINA — Bio-Adaptive Emotional Sanctuary · Powered by RaaOS Engine',
  description:
    'LUMINA · A bio-adaptive 3D emotional sanctuary, empathetic AI listener, and private somatic refuge powered by RaaOS Engine (Crafted by Rudra).',
  generator: 'RaaOS Engine',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SanctuaryProvider>{children}</SanctuaryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
