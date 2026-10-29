'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  MessageSquare,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import { formatPhone, whatsappChatUrl } from '@/lib/utils/phone';
import type { CustomerWithStats } from '@/types';

export function CustomersList() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load customers');

      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalCount(data.total || 0);
    } catch {
      // error handled
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Customer Directory
          </h1>
          <p className="text-xs text-gray-500">
            {totalCount} customers registered in Parappanangadi & Kerala
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
            placeholder="Search by customer name or phone..."
            className="input w-full pl-9 pr-3 text-xs"
            style={{ height: '38px' }}
          />
        </form>
      </div>

      {/* Customers Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-xs text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={42} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No customers found</h3>
            <p className="text-xs text-gray-500 mt-1">
              Customers are registered automatically when you create orders.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone / WhatsApp</th>
                  <th>Default Delivery Address</th>
                  <th className="text-center">Total Orders</th>
                  <th className="text-right">Total Spent</th>
                  <th className="text-right">Balance Due</th>
                  <th>Last Order</th>
                  <th className="text-center">Orders</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const hasDue = c.outstanding_balance_paise > 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="font-bold text-xs text-gray-900">
                        {c.name}
                        {c.email && (
                          <span className="block text-[11px] font-normal text-gray-400">
                            {c.email}
                          </span>
                        )}
                      </td>
                      <td className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-700">{formatPhone(c.phone)}</span>
                          <a
                            href={whatsappChatUrl(c.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare size={14} />
                          </a>
                        </div>
                      </td>
                      <td className="text-xs text-gray-600 max-w-[220px] truncate">
                        {c.default_address || '—'}
                      </td>
                      <td className="text-center text-xs font-bold text-gray-800">
                        {c.total_orders}
                      </td>
                      <td className="text-right text-xs font-bold text-gray-900">
                        {formatCurrency(c.total_spent_paise)}
                      </td>
                      <td className="text-right text-xs font-bold">
                        <span style={{ color: hasDue ? '#C62828' : '#2E7D32' }}>
                          {formatCurrency(c.outstanding_balance_paise)}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(c.last_order_date)}
                      </td>
                      <td className="text-center">
                        <Link
                          href={`/dashboard/orders?search=${encodeURIComponent(c.phone)}`}
                          className="btn btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                        >
                          View <ExternalLink size={11} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && customers.length > 0 && (
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
