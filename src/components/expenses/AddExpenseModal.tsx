'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { today } from '@/lib/utils';
import type { ExpenseCategory, PaymentMethod } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

const categories: ExpenseCategory[] = [
  'Ingredients',
  'Packaging',
  'Delivery',
  'Marketing',
  'Equipment',
  'Utilities',
  'Website',
  'Other',
];

export function AddExpenseModal({
  isOpen,
  onClose,
  onExpenseAdded,
}: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Ingredients');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid expense title and amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          amount: numAmount,
          expense_date: expenseDate,
          payment_method: paymentMethod,
          vendor: vendor.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add expense');
      }

      toast.success('Expense recorded successfully');
      onExpenseAdded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error recording expense');
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

        <h2 className="text-lg font-bold mb-4" style={{ color: '#1E3D29' }}>
          Record Business Expense
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Expense Title / Item *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50kg Basmati Rice or Kraft Boxes"
              className="input w-full text-xs"
              style={{ height: '38px' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="input w-full text-xs"
                style={{ height: '38px' }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Amount (INR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input w-full text-xs font-semibold"
                style={{ height: '38px' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="input w-full text-xs"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="input w-full text-xs"
                style={{ height: '38px' }}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online Payment">Online Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Vendor / Supplier (optional)
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Malabar Agro Traders"
              className="input w-full text-xs"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about this purchase..."
              className="input w-full text-xs p-2"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-5 py-2 font-bold flex items-center gap-2"
              style={{ background: '#2D5A3D' }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
