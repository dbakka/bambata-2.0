import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAMBATA 2.0 // AI-Powered DJ Mashup Studio',
  description: 'Reverse-engineer YouTube references, separate stems with Demucs v4 on serverless GPUs, arrange with Gemini Brain, and preview 15s drop options.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#08090d] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
