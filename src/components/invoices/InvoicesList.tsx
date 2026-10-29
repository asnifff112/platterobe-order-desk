'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Download,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

interface InvoiceWithOrder extends Invoice {
  order?: {
    id: string;
    order_number: string;
    order_date: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<InvoiceWithOrder[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load invoices');

      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotalCount(data.total || 0);
    } catch {
      // error handled
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Generated Invoices
          </h1>
          <p className="text-xs text-gray-500">
            History of all standard, partial, and paid invoice versions generated for orders
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <form onSubmit={handleSearchSubmit} className="max-w-md relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number (e.g. INV-01001)..."
            className="input w-full pl-9 pr-3 text-xs"
            style={{ height: '38px' }}
          />
        </form>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-xs text-gray-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={42} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No invoices generated</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Open any customer order and click &quot;Generate Invoice&quot; to create a PDF.
            </p>
            <Link
              href="/dashboard/orders"
              className="btn btn-secondary inline-block text-xs px-4 py-2"
            >
              Browse Orders
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Version</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Generated Date</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Balance Due</th>
                  <th>Payment Status</th>
                  <th className="text-center">PDF Download</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="font-bold text-xs" style={{ color: '#1E3D29' }}>
                      {inv.invoice_number}
                    </td>
                    <td>
                      <span className="badge badge-info text-[10px]">
                        v{inv.version}
                      </span>
                    </td>
                    <td className="text-xs font-semibold">
                      {inv.order ? (
                        <Link
                          href={`/dashboard/orders/${inv.order.id}`}
                          className="text-[#2D5A3D] hover:underline flex items-center gap-1"
                        >
                          {inv.order.order_number}
                          <ExternalLink size={11} />
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-xs">
                      {inv.order?.customer?.name || '—'}
                    </td>
                    <td className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(inv.created_at)}
                    </td>
                    <td className="text-right text-xs font-bold text-gray-900">
                      {formatCurrency(inv.total_paise)}
                    </td>
                    <td className="text-right text-xs font-bold">
                      <span style={{ color: inv.balance_due_paise > 0 ? '#C62828' : '#2E7D32' }}>
                        {formatCurrency(inv.balance_due_paise)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge text-[10px] ${
                          inv.payment_status === 'Paid'
                            ? 'badge-success'
                            : inv.payment_status === 'Partially Paid'
                            ? 'badge-warning'
                            : 'badge-error'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="text-center">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary px-3 py-1 text-xs inline-flex items-center gap-1.5"
                      >
                        <Download size={13} />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && invoices.length > 0 && (
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
