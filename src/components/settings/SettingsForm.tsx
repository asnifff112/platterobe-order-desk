'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  FileText,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import type { BusinessSettings } from '@/types';

export function SettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappCloudConfigured, setWhatsappCloudConfigured] = useState(false);

  // Settings form state
  const [businessName, setBusinessName] = useState('PLATTEROBE');
  const [storeDisplayName, setStoreDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [orderPrefix, setOrderPrefix] = useState('ORD');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [showDeliveryAddress, setShowDeliveryAddress] = useState(true);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('UPI');

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const s: BusinessSettings = data.settings;
          if (s) {
            setBusinessName(s.business_name || 'PLATTEROBE');
            setStoreDisplayName(s.store_display_name || '');
            setAddress(s.address || '');
            setPhone(s.phone || '');
            setEmail(s.email || '');
            setInvoicePrefix(s.invoice_prefix || 'INV');
            setOrderPrefix(s.order_prefix || 'ORD');
            setInvoiceFooter(s.invoice_footer || '');
            setSignatoryName(s.signatory_name || '');
            setShowOriginalPrice(s.show_original_price_on_invoice ?? false);
            setShowDeliveryAddress(s.show_delivery_address_on_invoice ?? true);
            setDefaultPaymentMethod(s.default_payment_method || 'UPI');
          }
          setWhatsappCloudConfigured(Boolean(data.whatsappCloudConfigured));
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        store_display_name: storeDisplayName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        invoice_prefix: invoicePrefix.trim().toUpperCase(),
        order_prefix: orderPrefix.trim().toUpperCase(),
        invoice_footer: invoiceFooter.trim(),
        signatory_name: signatoryName.trim(),
        show_original_price_on_invoice: showOriginalPrice,
        show_delivery_address_on_invoice: showDeliveryAddress,
        default_payment_method: defaultPaymentMethod,
      };

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Business settings updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 size={36} className="animate-spin mx-auto mb-3 text-[#2D5A3D]" />
        <p className="text-sm text-gray-500">Loading business configuration...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
            Business Settings
          </h1>
          <p className="text-xs text-gray-500">
            Configure PLATTEROBE branding, invoice formatting, and integration endpoints
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary px-5 py-2.5 font-bold flex items-center gap-2"
          style={{ background: '#2D5A3D' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save All Settings
        </button>
      </div>

      {/* Business Identity */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
          <Building2 size={18} style={{ color: '#2D5A3D' }} />
          Store Profile & Contact Info
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Primary Business Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Store Display Subtitle
            </label>
            <input
              type="text"
              value={storeDisplayName}
              onChange={(e) => setStoreDisplayName(e.target.value)}
              placeholder="e.g. Gourmet & Catering"
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Operating Address (Parappanangadi / Kerala)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Main Road, Parappanangadi, Malappuram, Kerala 676303"
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Business Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98460 12345"
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Business Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@platterobe.com"
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>
        </div>
      </div>

      {/* Invoice & Order Formatting */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
          <FileText size={18} style={{ color: '#2D5A3D' }} />
          Invoice & Order Numbering Defaults
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Invoice Prefix (e.g. INV → INV-01001)
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={invoicePrefix}
              onChange={(e) => setInvoicePrefix(e.target.value)}
              className="input w-full font-mono font-bold"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Order Prefix (e.g. ORD → ORD-01001)
            </label>
            <input
              type="text"
              required
              maxLength={8}
              value={orderPrefix}
              onChange={(e) => setOrderPrefix(e.target.value)}
              className="input w-full font-mono font-bold"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Authorized Signatory Title
            </label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Authorized Signatory"
              className="input w-full"
              style={{ height: '38px' }}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Default Payment Method
            </label>
            <select
              value={defaultPaymentMethod}
              onChange={(e) => setDefaultPaymentMethod(e.target.value)}
              className="input w-full"
              style={{ height: '38px' }}
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Online Payment">Online Payment</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Invoice Footer Terms / Message
            </label>
            <textarea
              rows={2}
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              placeholder="e.g. Thank you for choosing PLATTEROBE! Enjoy your meal."
              className="input w-full p-2.5"
            />
          </div>

          <div className="sm:col-span-2 space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeliveryAddress}
                onChange={(e) => setShowDeliveryAddress(e.target.checked)}
                className="rounded text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <span className="font-semibold text-gray-700">
                Display customer delivery address on printed invoices
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOriginalPrice}
                onChange={(e) => setShowOriginalPrice(e.target.checked)}
                className="rounded text-[#2D5A3D] focus:ring-[#2D5A3D]"
              />
              <span className="font-semibold text-gray-700">
                Display original price alongside discounted selling price
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration Status */}
      <div className="card p-6 space-y-3">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
          <MessageSquare size={18} style={{ color: '#25D366' }} />
          WhatsApp Integration Status
        </h2>

        {whatsappCloudConfigured ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-900 text-xs">
                Meta WhatsApp Business Cloud API Connected
              </h3>
              <p className="text-xs text-emerald-700 mt-1">
                Your environment variables (<code>WHATSAPP_ACCESS_TOKEN</code> & <code>WHATSAPP_PHONE_NUMBER_ID</code>) are active. Invoices can be dispatched directly via Cloud API or shared manually.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 text-xs">
                Manual WhatsApp Click-to-Chat Enabled (Zero API keys required)
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                Admins can share invoices and order details instantly via pre-filled <strong>WhatsApp Web / App</strong> links (<code>wa.me</code>) directly from any order page without Meta credentials.
              </p>
              <p className="text-[11px] text-amber-600 mt-2">
                To optionally enable automated background sending, configure <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code> in <code>.env.local</code>.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary px-6 py-2.5 font-bold flex items-center gap-2"
          style={{ background: '#2D5A3D' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>
    </form>
  );
}
