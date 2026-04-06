import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'VisualClocks — See time across the world, instantly',
  description:
    'Beautiful world clock grid with real-time city times, analog & digital dials, and an interactive map.',
  keywords: ['world clock', 'time zones', 'map', 'analog clock', 'digital clock', 'travel'],
  openGraph: {
    title: 'VisualClocks — See time across the world, instantly',
    description: 'See local times across the world, beautifully.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VisualClocks',
    description: 'See time across the world, instantly',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.className}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body className="antialiased" style={{ height: '100dvh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
