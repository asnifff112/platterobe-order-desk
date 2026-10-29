'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import type { Expense } from '@/types';

const categories: Array<{ label: string; value: string }> = [
  { label: 'All Expenses', value: '' },
  { label: 'Ingredients', value: 'Ingredients' },
  { label: 'Packaging', value: 'Packaging' },
  { label: 'Delivery', value: 'Delivery' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'Equipment', value: 'Equipment' },
  { label: 'Utilities', value: 'Utilities' },
  { label: 'Other', value: 'Other' },
];

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPaise, setTotalPaise] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const limit = 20;

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load expenses');

      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalCount(data.total || 0);
      setTotalPaise(data.total_paise || 0);
    } catch {
      // error handled
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete expense');

      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting expense');
    }
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Business Expenses
          </h1>
          <p className="text-xs text-gray-500">
            Track operational costs, food ingredients, packaging, and utilities
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary flex items-center gap-2 px-4 py-2 font-semibold text-sm shadow-sm"
          style={{ background: '#2D5A3D' }}
        >
          <Plus size={18} />
          Record Expense
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((tab) => {
          const isActive = selectedCategory === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setSelectedCategory(tab.value);
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

      {/* Total Banner */}
      <div className="card p-4 flex items-center justify-between bg-[#FCFCFB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
            <TrendingDown size={18} />
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Total Filtered Expenses:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(totalPaise)}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          Showing {totalCount} records
        </span>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-[#2D5A3D]" />
            <p className="text-xs text-gray-500">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt size={42} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-semibold text-gray-700">No expenses recorded</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Click &quot;Record Expense&quot; to add your ingredient or utility costs.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-secondary text-xs px-4 py-2"
            >
              Record First Expense
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title / Item</th>
                  <th>Category</th>
                  <th className="text-right">Amount (INR)</th>
                  <th>Payment Method</th>
                  <th>Vendor / Supplier</th>
                  <th>Description</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="font-bold text-xs text-gray-900">
                      {exp.title}
                    </td>
                    <td>
                      <span className="badge badge-neutral text-[10px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="text-right text-xs font-bold text-red-700">
                      - {formatCurrency(exp.amount_paise)}
                    </td>
                    <td className="text-xs text-gray-700">
                      {exp.payment_method}
                    </td>
                    <td className="text-xs text-gray-600">
                      {exp.vendor || '—'}
                    </td>
                    <td className="text-xs text-gray-500 max-w-[200px] truncate">
                      {exp.description || '—'}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && expenses.length > 0 && (
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

      <AddExpenseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onExpenseAdded={fetchExpenses}
      />
    </div>
  );
}
