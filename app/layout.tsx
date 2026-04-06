import type { Metadata } from 'next'
import './globals.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export const metadata: Metadata = {
  title: 'VisualClocks — See time across the world, instantly',
  description:
    'A beautiful full-screen world map with real-time day/night overlay, city time lookup, and pinned city clocks.',
  keywords: ['world clock', 'time zones', 'map', 'day night', 'travel'],
  openGraph: {
    title: 'VisualClocks — See time across the world, instantly',
    description: 'Interactive world map showing real-time local times across every timezone.',
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
    <html lang="en">
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
