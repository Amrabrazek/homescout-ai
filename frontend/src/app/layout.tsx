import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ApolloWrapper } from '@/lib/apollo/provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Nawy',
    default: 'Nawy - Premium Property Listings',
  },
  description: 'Browse available apartment listings',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/favicon.ico', type: 'image/x-icon' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <ApolloWrapper>{children}</ApolloWrapper>
        <Toaster />
      </body>
    </html>
  );
}
