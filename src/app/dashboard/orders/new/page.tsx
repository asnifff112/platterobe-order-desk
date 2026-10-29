import type { Metadata } from 'next';
import { CreateOrderForm } from '@/components/orders/CreateOrderForm';

export const metadata: Metadata = {
  title: 'Create Order — PLATTEROBE ORDER DESK',
  description: 'Create a new customer order with line items and automatic totals calculation',
};

export default function NewOrderPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CreateOrderForm />
    </div>
  );
}
