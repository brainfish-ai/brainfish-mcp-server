import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Brainfish MCP Server',
  description: 'Model Context Protocol server for Brainfish knowledge base management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="dark">{children}</body>
    </html>
  )
}