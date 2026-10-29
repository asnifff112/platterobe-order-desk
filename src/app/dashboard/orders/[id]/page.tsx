import type { Metadata } from 'next';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

export const metadata: Metadata = {
  title: 'Order Details — PLATTEROBE ORDER DESK',
  description: 'View order details, manage payments, and generate invoices',
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <OrderDetailView orderId={id} />
    </div>
  );
}
