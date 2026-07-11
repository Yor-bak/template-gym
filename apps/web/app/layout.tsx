import type { Metadata } from 'next';
import { Archivo, Barlow_Condensed, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ReactQueryProvider } from '@/lib/query-client';
import { StoreProvider } from '@/lib/store';
import { CameraProvider } from '@/lib/camera/CameraContext';
import { ScannerProvider } from '@/lib/camera/ScannerContext';
import { InventoryCartProvider } from '@/lib/cart/InventoryCartContext';

// Sistema visual "Riel de Turno": cuerpo/tablas/formularios en Archivo,
// encabezados y números destacados en Barlow Condensed, datos tabulares
// (folios, fechas, SKU) en IBM Plex Mono — ver handoff verdefosfo/README.md.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', weight: ['400', '500', '600', '700'] });
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  weight: ['500', '600', '700', '800'],
});
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Template Gym - American Fitness',
  description: 'Sistema de gestión para gimnasios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <body className={`${archivo.variable} ${barlowCondensed.variable} ${plexMono.variable} font-sans antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            <StoreProvider>
              <CameraProvider>
                <ScannerProvider>
                  <InventoryCartProvider>
                    {children}
                  </InventoryCartProvider>
                </ScannerProvider>
              </CameraProvider>
            </StoreProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
