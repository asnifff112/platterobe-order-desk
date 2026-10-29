'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { OrderStatus } from '@/types';

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: OrderStatus;
  onStatusUpdated: (newStatus: OrderStatus) => void;
  onRequestCancel: () => void;
}

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: 'New', label: 'New' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Preparing', label: 'Preparing' },
  { value: 'Ready for Delivery', label: 'Ready for Delivery' },
  { value: 'Out for Delivery', label: 'Out for Delivery' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
  onStatusUpdated,
  onRequestCancel,
}: OrderStatusSelectProps) {
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value as OrderStatus;
    if (nextStatus === currentStatus) return;

    if (nextStatus === 'Cancelled') {
      onRequestCancel();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success(`Order status changed to ${nextStatus}`);
      onStatusUpdated(nextStatus);
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return '#2E7D32';
      case 'Out for Delivery':
      case 'Ready for Delivery':
        return '#0288D1';
      case 'Preparing':
      case 'Confirmed':
        return '#E65100';
      case 'Cancelled':
        return '#C62828';
      default:
        return '#555555';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      {loading && <Loader2 size={14} className="animate-spin text-gray-500" />}
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={loading || currentStatus === 'Cancelled'}
        className="font-bold text-xs uppercase tracking-wider py-1.5 px-3 rounded-full border cursor-pointer focus:outline-none"
        style={{
          borderColor: getStatusColor(currentStatus),
          color: getStatusColor(currentStatus),
          backgroundColor: '#FFFFFF',
        }}
      >
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-800 normal-case">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
