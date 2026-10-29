import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ReportsView } from '@/components/reports/ReportsView';

export const metadata: Metadata = {
  title: 'Reports & Exports — PLATTEROBE ORDER DESK',
  description: 'Sales summaries, pending payment reports, and CSV exports',
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading reports...</div>}>
        <ReportsView />
      </Suspense>
    </div>
  );
}
