'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface CancelOrderModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelOrderModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onCancelled,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancelling this order');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_status: 'Cancelled',
          cancelled_reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      toast.success(`Order ${orderNumber} cancelled`);
      onCancelled();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="card w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200"
        style={{ background: '#FFFFFF', borderRadius: '12px' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#FFEBEE', color: '#C62828' }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#C62828' }}>
              Cancel Order {orderNumber}
            </h2>
            <p className="text-xs text-gray-500">
              This action marks the order as cancelled and excludes it from sales revenue.
            </p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Cancellation Reason *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer called to cancel due to schedule change"
              className="input w-full text-sm p-2"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary px-4 py-2 text-sm"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn px-5 py-2 text-sm flex items-center gap-2 font-bold text-white"
              style={{ background: '#C62828' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
