import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PaymentsList } from '@/components/payments/PaymentsList';

export const metadata: Metadata = {
  title: 'Payments — PLATTEROBE ORDER DESK',
  description: 'Track customer payments, transaction references, and payment voids',
};

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading payments...</div>}>
        <PaymentsList />
      </Suspense>
    </div>
  );
}
