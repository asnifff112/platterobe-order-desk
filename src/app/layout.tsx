import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'PLATTEROBE ORDER DESK',
  description: 'Business administration dashboard for PLATTEROBE — Manage orders, invoices, and payments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          }}
        />
      </body>
    </html>
  );
}
