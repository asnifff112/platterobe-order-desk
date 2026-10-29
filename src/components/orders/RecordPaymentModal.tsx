'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { paiseToRupees, formatRupees } from '@/lib/utils/currency';
import { today, generateIdempotencyKey } from '@/lib/utils';
import type { PaymentMethod } from '@/types';

interface RecordPaymentModalProps {
  orderId: string;
  orderNumber: string;
  totalPaise: number;
  balanceDuePaise: number;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export function RecordPaymentModal({
  orderId,
  orderNumber,
  balanceDuePaise,
  isOpen,
  onClose,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const maxDueRupees = paiseToRupees(balanceDuePaise);

  const [amount, setAmount] = useState<string>(
    maxDueRupees > 0 ? String(maxDueRupees) : ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: numAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          transaction_reference: transactionRef.trim(),
          notes: notes.trim(),
          idempotency_key: generateIdempotencyKey(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      toast.success(
        data.duplicate
          ? 'Payment was already recorded'
          : `Payment of ${formatRupees(numAmount)} recorded successfully`
      );

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Payment recording failed');
    } finally {
      setLoading(false);
    }
  }

  function handleFillFullDue() {
    setAmount(String(maxDueRupees));
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
            style={{ background: '#E8F5E9', color: '#2D5A3D' }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1E3D29' }}>
              Record Payment
            </h2>
            <p className="text-xs text-gray-500">
              For Order <span className="font-semibold">{orderNumber}</span>
            </p>
          </div>
        </div>

        {/* Current Balance Banner */}
        <div
          className="p-3 rounded-lg mb-4 flex items-center justify-between"
          style={{ background: '#F7F4E8', border: '1px solid #E5DFC8' }}
        >
          <div>
            <span className="text-xs text-gray-600 block">Current Balance Due:</span>
            <span className="text-base font-bold" style={{ color: balanceDuePaise > 0 ? '#C62828' : '#2D5A3D' }}>
              {formatRupees(maxDueRupees)}
            </span>
          </div>
          {maxDueRupees > 0 && (
            <button
              type="button"
              onClick={handleFillFullDue}
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{ background: '#2D5A3D', color: '#FFFFFF' }}
            >
              Pay Full Due
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payment Amount (INR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input w-full pl-8 font-semibold text-base"
                style={{ height: '42px' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input w-full"
                style={{ height: '40px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input w-full"
                style={{ height: '40px' }}
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cash">Cash on Delivery</option>
                <option value="Bank Transfer">Bank Transfer / IMPS</option>
                <option value="Online Payment">Online Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Transaction Reference / UTR
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI/412399881122 or Cash Slip #"
              className="input w-full text-sm"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Payment Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via GPay from customer phone"
              className="input w-full text-sm"
              style={{ height: '38px' }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-5 py-2 text-sm flex items-center gap-2"
              style={{ background: '#2D5A3D' }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
