'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import { formatPhone, whatsappChatUrl } from '@/lib/utils/phone';
import type { OrderWithCustomer, OrderStatus, PaymentStatus } from '@/types';

const statusTabs: Array<{ label: string; value: string }> = [
  { label: 'All Orders', value: '' },
  { label: 'New', value: 'New' },
  { label: 'Confirmed', value: 'Confirmed' },
  { label: 'Preparing', value: 'Preparing' },
  { label: 'Ready', value: 'Ready for Delivery' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export function OrdersTable() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || '');
  const [selectedPayment, setSelectedPayment] = useState<string>(searchParams.get('payment_status') || '');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedPayment) params.set('payment_status', selectedPayment);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load orders');

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error fetching orders');
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedPayment, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return <span className="badge badge-success">{status}</span>;
      case 'Out for Delivery':
      case 'Ready for Delivery':
        return <span className="badge badge-info">{status}</span>;
      case 'Preparing':
      case 'Confirmed':
        return <span className="badge badge-warning">{status}</span>;
      case 'Cancelled':
        return <span className="badge badge-error">{status}</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return <span className="badge badge-success">Paid</span>;
      case 'Partially Paid':
        return <span className="badge badge-warning">Partial</span>;
      case 'Refunded':
      case 'Partially Refunded':
        return <span className="badge badge-info">{status}</span>;
      default:
        return <span className="badge badge-error">Pending</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Customer Orders
          </h1>
          <p className="text-xs text-gray-500">
            Showing {totalCount} total orders in system
          </p>
        </div>

        <Link
          href="/dashboard/orders/new"
          className="btn btn-primary flex items-center gap-2 px-4 py-2 font-semibold text-sm shadow-sm"
          style={{ background: '#2D5A3D' }}
        >
          <Plus size={18} />
          Create New Order
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer name, or phone..."
            className="input w-full pl-9 pr-3 text-xs"
            style={{ height: '38px' }}
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
              <Filter size={13} /> Payment:
            </span>
            <select
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                setPage(1);
              }}
              className="input text-xs"
              style={{ height: '38px', minWidth: '130px' }}
            >
              <option value="">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-xs text-gray-500">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag size={42} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No orders found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Try adjusting your search filters or create a new order.
            </p>
            <Link
              href="/dashboard/orders/new"
              className="btn btn-primary inline-flex items-center gap-2 text-xs px-4 py-2"
              style={{ background: '#2D5A3D' }}
            >
              <Plus size={16} />
              Create First Order
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance Due</th>
                  <th>Payment</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const hasDue = order.balance_due_paise > 0;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="font-bold text-xs" style={{ color: '#1E3D29' }}>
                        <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(order.order_date)}
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-gray-900">
                          {order.customer?.name}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <span>{formatPhone(order.customer?.phone || '')}</span>
                          {order.customer?.phone && (
                            <a
                              href={whatsappChatUrl(order.customer.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td>{getStatusBadge(order.order_status)}</td>
                      <td className="text-right text-xs font-bold text-gray-900">
                        {formatCurrency(order.total_paise)}
                      </td>
                      <td className="text-right text-xs text-gray-700">
                        {formatCurrency(order.amount_received_paise)}
                      </td>
                      <td className="text-right text-xs font-bold">
                        <span style={{ color: hasDue ? '#C62828' : '#2E7D32' }}>
                          {formatCurrency(order.balance_due_paise)}
                        </span>
                      </td>
                      <td>{getPaymentBadge(order.payment_status)}</td>
                      <td className="text-center">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="btn btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={13} />
                          Details
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
        {!loading && orders.length > 0 && (
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
