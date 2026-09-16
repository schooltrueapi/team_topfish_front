import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'TopFish Control — Управление производством',
  description: 'Система еженедельного планирования производства, чеклистов и учета итогов цеха',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#fff',
                fontSize: '14px',
                borderRadius: '8px',
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
