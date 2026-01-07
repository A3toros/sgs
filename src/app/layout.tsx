import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Teacher Configuration App',
  description: 'Configure and generate Python scripts for teacher data entry',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
