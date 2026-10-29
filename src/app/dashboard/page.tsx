import type { Metadata } from 'next';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata: Metadata = {
  title: 'Dashboard — PLATTEROBE ORDER DESK',
  description: 'Overview of orders, payments, and business metrics',
};

export default function DashboardPage() {
  return <DashboardContent />;
}
