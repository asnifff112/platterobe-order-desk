'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Calendar,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import { formatPhone } from '@/lib/utils/phone';

interface SalesSummary {
  total_sales_paise: number;
  total_received_paise: number;
  total_expenses_paise: number;
  net_profit_paise: number;
  total_orders: number;
  average_order_value_paise: number;
}

interface MonthlyData {
  key: string;
  label: string;
  order_count: number;
  total_sales_paise: number;
  payments_received_paise: number;
  expenses_paise: number;
  net_paise: number;
}

interface PendingOrder {
  id: string;
  order_number: string;
  order_date: string;
  total_paise: number;
  amount_received_paise: number;
  balance_due_paise: number;
  customer?: {
    name: string;
    phone: string;
  };
}

export function ReportsView() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [totalPendingPaise, setTotalPendingPaise] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // CSV export date filters
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const [salesRes, pendingRes] = await Promise.all([
          fetch(`/api/reports/sales?period=monthly&year=${selectedYear}`),
          fetch('/api/reports/pending'),
        ]);

        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSummary(salesData.summary);
          setMonthlyData(salesData.data || []);
        }

        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingOrders(pendingData.orders || []);
          setTotalPendingPaise(pendingData.total_outstanding_paise || 0);
        }
      } catch {
        // handled
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [selectedYear]);

  function handleExportCsv(type: 'orders' | 'payments' | 'expenses') {
    const params = new URLSearchParams();
    params.set('type', type);
    if (exportStartDate) params.set('startDate', exportStartDate);
    if (exportEndDate) params.set('endDate', exportEndDate);

    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 size={36} className="animate-spin mx-auto mb-3 text-[#2D5A3D]" />
        <p className="text-sm text-gray-500">Compiling financial reports & analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Financial Reports & Analytics
          </h1>
          <p className="text-xs text-gray-500">
            Real database summaries excluding cancelled orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="input text-xs font-bold"
            style={{ height: '36px' }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Gross Sales ({selectedYear})</span>
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <span className="text-xl font-bold text-gray-900 block">
            {formatCurrency(summary?.total_sales_paise ?? 0)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {summary?.total_orders ?? 0} valid completed orders
          </span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Payments Collected</span>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="text-xl font-bold text-gray-900 block">
            {formatCurrency(summary?.total_received_paise ?? 0)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Via UPI, Cash, & Bank Transfer
          </span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Operational Expenses</span>
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <span className="text-xl font-bold text-red-700 block">
            {formatCurrency(summary?.total_expenses_paise ?? 0)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Ingredients, packaging, fuel & utilities
          </span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Pending Receivables</span>
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <span className="text-xl font-bold text-amber-800 block">
            {formatCurrency(totalPendingPaise)}
          </span>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Across {pendingOrders.length} customer orders
          </span>
        </div>
      </div>

      {/* Monthly Sales Breakdown Table */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 size={18} style={{ color: '#2D5A3D' }} />
          Monthly Performance Breakdown ({selectedYear})
        </h2>

        <div className="table-responsive">
          <table className="table w-full text-xs">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-center">Orders</th>
                <th className="text-right">Total Sales</th>
                <th className="text-right">Collections</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => {
                const isPositive = m.net_paise >= 0;
                return (
                  <tr key={m.key} className="hover:bg-gray-50">
                    <td className="font-bold text-gray-900">{m.label}</td>
                    <td className="text-center font-semibold text-gray-700">{m.order_count}</td>
                    <td className="text-right font-bold text-gray-900">
                      {formatCurrency(m.total_sales_paise)}
                    </td>
                    <td className="text-right text-gray-700">
                      {formatCurrency(m.payments_received_paise)}
                    </td>
                    <td className="text-right text-red-700">
                      {m.expenses_paise > 0 ? `- ${formatCurrency(m.expenses_paise)}` : '₹0.00'}
                    </td>
                    <td className="text-right font-bold">
                      <span style={{ color: isPositive ? '#2E7D32' : '#C62828' }}>
                        {formatCurrency(m.net_paise)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Receivables Report Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              Pending Payment Receivables
            </h2>
            <p className="text-xs text-gray-500">
              Orders with an active balance due, sorted by amount
            </p>
          </div>
          <span className="badge badge-warning text-xs font-bold">
            Total Due: {formatCurrency(totalPendingPaise)}
          </span>
        </div>

        {pendingOrders.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">
            🎉 All orders are fully paid! No outstanding receivables.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table w-full text-xs">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Order Date</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-right">Order Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right font-bold text-red-700">Balance Due</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-amber-50/40">
                    <td className="font-bold text-gray-900">
                      <Link href={`/dashboard/orders/${o.id}`} className="hover:underline text-[#2D5A3D]">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="text-gray-600 whitespace-nowrap">{formatDate(o.order_date)}</td>
                    <td className="font-semibold text-gray-900">{o.customer?.name}</td>
                    <td className="font-mono text-gray-600">{formatPhone(o.customer?.phone || '')}</td>
                    <td className="text-right text-gray-800">{formatCurrency(o.total_paise)}</td>
                    <td className="text-right text-gray-600">{formatCurrency(o.amount_received_paise)}</td>
                    <td className="text-right font-bold text-red-700">
                      {formatCurrency(o.balance_due_paise)}
                    </td>
                    <td className="text-center">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="btn btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                      >
                        Collect <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Exports Section */}
      <div className="card p-5 bg-[#FCFCFB]">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet size={18} style={{ color: '#2D5A3D' }} />
          <h2 className="text-base font-bold text-gray-900">
            Export Data to CSV
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Export full real database records to CSV spreadsheets for offline accounting, Excel, or tax filings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Start Date (optional)
            </label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="input w-full text-xs"
              style={{ height: '36px' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              End Date (optional)
            </label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="input w-full text-xs"
              style={{ height: '36px' }}
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportCsv('orders')}
              className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold"
            >
              <Download size={14} /> Orders CSV
            </button>
            <button
              onClick={() => handleExportCsv('payments')}
              className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold"
            >
              <Download size={14} /> Payments CSV
            </button>
            <button
              onClick={() => handleExportCsv('expenses')}
              className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 font-semibold"
            >
              <Download size={14} /> Expenses CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
