import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SettingsForm } from '@/components/settings/SettingsForm';

export const metadata: Metadata = {
  title: 'Settings — PLATTEROBE ORDER DESK',
  description: 'Manage business identity, invoice prefixes, and WhatsApp integration',
};

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Suspense fallback={<div className="p-12 text-center text-xs text-gray-400">Loading settings...</div>}>
        <SettingsForm />
      </Suspense>
    </div>
  );
}
