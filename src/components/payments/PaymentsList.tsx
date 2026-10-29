'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CreditCard,
  Ban,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import type { Payment } from '@/types';

interface PaymentWithOrder extends Payment {
  order?: {
    id: string;
    order_number: string;
    total_paise: number;
    payment_status: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export function PaymentsList() {
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [method, setMethod] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (method) params.set('method', method);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load payments');

      const data = await res.json();
      setPayments(data.payments || []);
      setTotalCount(data.total || 0);
    } catch {
      // error handled
    } finally {
      setLoading(false);
    }
  }, [method, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handleVoid(paymentId: string) {
    const reason = prompt('Please enter a reason for voiding this payment:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`/api/payments/${paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to void payment');
      }

      toast.success('Payment marked as void and order balance recalculated');
      await fetchPayments();
    } catch (err: any) {
      toast.error(err.message || 'Error voiding payment');
    }
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Active total amount
  const validTotalPaise = payments
    .filter((p) => !p.is_void)
    .reduce((sum, p) => sum + p.amount_paise, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Payments & Collections
          </h1>
          <p className="text-xs text-gray-500">
            Real-time ledger of customer payments across UPI, Cash, and Bank Transfers
          </p>
        </div>
      </div>

      {/* Filter and Summary Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Filter size={13} /> Method:
          </span>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="input text-xs"
            style={{ height: '36px', minWidth: '150px' }}
          >
            <option value="">All Methods</option>
            <option value="UPI">UPI (GPay / PhonePe)</option>
            <option value="Cash">Cash on Delivery</option>
            <option value="Bank Transfer">Bank Transfer / IMPS</option>
            <option value="Online Payment">Online Payment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="text-right text-xs">
          <span className="text-gray-500 mr-2">Page Total Received:</span>
          <span className="text-base font-bold" style={{ color: '#2D5A3D' }}>
            {formatCurrency(validTotalPaise)}
          </span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-xs text-gray-500">Loading payments ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={42} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No payments found</h3>
            <p className="text-xs text-gray-500 mt-1">
              Payments are recorded directly from the Order Details page.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th className="text-right">Amount (INR)</th>
                  <th>Reference / UTR</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      p.is_void ? 'opacity-60 bg-red-50/30' : ''
                    }`}
                  >
                    <td className="text-xs text-gray-700 whitespace-nowrap">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="text-xs font-bold" style={{ color: '#1E3D29' }}>
                      {p.order ? (
                        <Link
                          href={`/dashboard/orders/${p.order.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {p.order.order_number}
                          <ExternalLink size={11} />
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs">
                      {p.order?.customer?.name || '—'}
                    </td>
                    <td>
                      <span className="badge badge-neutral text-[10px]">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="text-right text-xs font-bold">
                      <span className={p.is_void ? 'line-through text-gray-400' : 'text-gray-900'}>
                        {formatCurrency(p.amount_paise)}
                      </span>
                    </td>
                    <td className="text-xs font-mono text-gray-600">
                      {p.transaction_reference || '—'}
                    </td>
                    <td>
                      {p.is_void ? (
                        <span className="badge badge-error text-[10px]">Voided</span>
                      ) : (
                        <span className="badge badge-success text-[10px]">Valid</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500 max-w-[180px] truncate">
                      {p.notes || (p.is_void ? `Void: ${p.voided_reason}` : '—')}
                    </td>
                    <td className="text-center">
                      {!p.is_void && (
                        <button
                          onClick={() => handleVoid(p.id)}
                          className="btn btn-secondary px-2 py-1 text-xs text-red-600 hover:text-red-700 flex items-center gap-1 mx-auto"
                          title="Void Payment"
                        >
                          <Ban size={12} /> Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && payments.length > 0 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>
              Page <span className="font-semibold text-gray-800">{page}</span> of{' '}
              <span className="font-semibold text-gray-800">{totalPages}</span> ({totalCount} items)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
