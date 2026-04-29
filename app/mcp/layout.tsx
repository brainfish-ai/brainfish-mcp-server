import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@brainfish-ai/components/styles.css';
import './mcp-landing.css';

export const metadata: Metadata = {
  title: 'Brainfish MCP Server',
  description:
    'Model Context Protocol server for Brainfish knowledge base management',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function McpLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
