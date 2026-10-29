import { Suspense } from 'react';
import type { Metadata } from 'next';
import { InvoicesList } from '@/components/invoices/InvoicesList';

export const metadata: Metadata = {
  title: 'Invoices — PLATTEROBE ORDER DESK',
  description: 'View and download generated PDF invoice versions',
};

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading invoices...</div>}>
        <InvoicesList />
      </Suspense>
    </div>
  );
}
