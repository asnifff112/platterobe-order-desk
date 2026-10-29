'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import type { DashboardMetrics, OrderWithCustomer } from '@/types';

export function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [metricsRes, ordersRes] = await Promise.all([
          fetch('/api/dashboard/metrics'),
          fetch('/api/orders?limit=5&sort=created_at&order=desc'),
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data);
        }

        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setRecentOrders(data.orders || []);
        }
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#2D5A3D' }} />
          <p className="text-sm" style={{ color: '#9B9B9B' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <AlertCircle size={48} style={{ color: '#C62828', marginBottom: '16px' }} />
        <p>{error}</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Orders',
      value: metrics?.total_orders ?? 0,
      icon: ShoppingBag,
      color: '#2D5A3D',
      bgColor: '#E8F5E9',
    },
    {
      label: "Today's Orders",
      value: metrics?.todays_orders ?? 0,
      icon: Clock,
      color: '#1565C0',
      bgColor: '#E3F2FD',
    },
    {
      label: 'Total Order Value',
      value: formatCurrency(metrics?.total_order_value_paise ?? 0),
      icon: TrendingUp,
      color: '#2D5A3D',
      bgColor: '#E8F5E9',
      isCurrency: true,
    },
    {
      label: 'Payments Received',
      value: formatCurrency(metrics?.total_payments_received_paise ?? 0),
      icon: DollarSign,
      color: '#2D5A3D',
      bgColor: '#E8F5E9',
      isCurrency: true,
    },
    {
      label: 'Pending Payments',
      value: formatCurrency(metrics?.pending_payments_paise ?? 0),
      icon: AlertCircle,
      color: '#E8A838',
      bgColor: '#FFF8E1',
      isCurrency: true,
    },
    {
      label: 'Outstanding Balance',
      value: formatCurrency(metrics?.outstanding_balance_paise ?? 0),
      icon: CreditCard,
      color: '#C62828',
      bgColor: '#FFEBEE',
      isCurrency: true,
    },
    {
      label: 'Paid Orders',
      value: metrics?.paid_orders ?? 0,
      icon: CheckCircle2,
      color: '#2D5A3D',
      bgColor: '#E8F5E9',
    },
    {
      label: 'Pending Orders',
      value: metrics?.pending_orders ?? 0,
      icon: Clock,
      color: '#E8A838',
      bgColor: '#FFF8E1',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#2C2C2C' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9B9B9B' }}>
            Welcome back — here&apos;s your business overview
          </p>
        </div>
        <Link href="/dashboard/orders/new" className="btn btn-primary">
          <Plus size={18} />
          Create New Order
        </Link>
      </div>

      {/* Metrics Grid */}
      <div
        className="grid gap-4 mb-8"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#9B9B9B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: stat.bgColor }}
                >
                  <Icon size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: '#2C2C2C', fontFamily: 'Outfit, sans-serif' }}>
                {stat.isCurrency ? stat.value : stat.value.toLocaleString('en-IN')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Recent Orders
            </h2>
            <Link
              href="/dashboard/orders"
              className="btn btn-ghost btn-sm"
              style={{ color: '#2D5A3D' }}
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="card-body" style={{ padding: '0' }}>
          {recentOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <ShoppingBag size={36} style={{ color: '#E0D2B7', marginBottom: '12px' }} />
              <p className="text-sm" style={{ color: '#9B9B9B' }}>No orders yet</p>
              <Link href="/dashboard/orders/new" className="btn btn-primary btn-sm mt-3">
                <Plus size={14} />
                Create First Order
              </Link>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="font-medium"
                          style={{ color: '#2D5A3D', textDecoration: 'none' }}
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td>{order.customer?.name || '—'}</td>
                      <td style={{ color: '#6B6B6B' }}>{formatDate(order.order_date)}</td>
                      <td className="font-medium">{formatCurrency(order.total_paise)}</td>
                      <td>
                        <span className={`badge ${
                          order.payment_status === 'Paid' ? 'badge-success' :
                          order.payment_status === 'Partially Paid' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          order.order_status === 'Delivered' ? 'badge-success' :
                          order.order_status === 'Cancelled' ? 'badge-danger' :
                          'badge-info'
                        }`}>
                          {order.order_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
