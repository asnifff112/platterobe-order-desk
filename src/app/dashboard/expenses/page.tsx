import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ExpensesList } from '@/components/expenses/ExpensesList';

export const metadata: Metadata = {
  title: 'Expenses — PLATTEROBE ORDER DESK',
  description: 'Track food ingredients, packaging, delivery, and kitchen operational costs',
};

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading expenses...</div>}>
        <ExpensesList />
      </Suspense>
    </div>
  );
}
