import { Suspense } from 'react';
import type { Metadata } from 'next';
import { OrdersTable } from '@/components/orders/OrdersTable';

export const metadata: Metadata = {
  title: 'Orders — PLATTEROBE ORDER DESK',
  description: 'Manage customer orders, track payments, and generate invoices',
};

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading orders...</div>}>
        <OrdersTable />
      </Suspense>
    </div>
  );
}
