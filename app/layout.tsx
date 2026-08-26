import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

/**
 * The Figma uses a geometric sans with a single-storey `g` - Poppins.
 */
const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'To-Do List',
  description: 'Plan your week, track what you finish.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the layout use env(safe-area-inset-*) so the FAB clears the home indicator.
  viewportFit: 'cover',
  themeColor: '#4566ec',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
