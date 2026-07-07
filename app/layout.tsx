import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Template Gym - American Fitness',
  description: 'Sistema de gestión para gimnasios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
