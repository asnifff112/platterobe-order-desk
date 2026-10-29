import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CustomersList } from '@/components/customers/CustomersList';

export const metadata: Metadata = {
  title: 'Customers — PLATTEROBE ORDER DESK',
  description: 'Manage customer profiles, contact info, and lifetime order history',
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading customers...</div>}>
        <CustomersList />
      </Suspense>
    </div>
  );
}
