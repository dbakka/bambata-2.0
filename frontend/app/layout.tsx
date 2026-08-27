import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAMBATA 2.0 // AI-Powered DJ Mashup Studio',
  description: 'Deterministic Gap Surgery, Spotify Pedalboard DSP, and Minimalist Light Studio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-white text-zinc-900 antialiased selection:bg-pink-500/20 selection:text-pink-600">
        {children}
      </body>
    </html>
  );
}
