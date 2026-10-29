'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  CreditCard,
  MessageSquare,
  Download,
  AlertTriangle,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  User,
  Plus,
  RefreshCw,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils';
import { formatPhone, whatsappChatUrl } from '@/lib/utils/phone';
import { OrderStatusSelect } from '@/components/orders/OrderStatusSelect';
import { RecordPaymentModal } from '@/components/orders/RecordPaymentModal';
import { WhatsAppShareModal } from '@/components/orders/WhatsAppShareModal';
import { CancelOrderModal } from '@/components/orders/CancelOrderModal';
import type { OrderWithDetails, Invoice } from '@/types';

interface OrderDetailViewProps {
  orderId: string;
}

export function OrderDetailView({ orderId }: OrderDetailViewProps) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState<Invoice | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Generate invoice handler
  async function handleGenerateInvoice() {
    if (!order) return;
    setGeneratingInvoice(true);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      toast.success(
        `Invoice ${data.invoice.invoice_number} (v${data.invoice.version}) generated!`
      );
      await fetchOrderDetails();

      // Trigger automatic download/open
      window.open(`/api/invoices/${data.invoice.id}/pdf`, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Invoice generation failed');
    } finally {
      setGeneratingInvoice(false);
    }
  }

  // Void payment handler
  async function handleVoidPayment(paymentId: string) {
    const reason = prompt('Please enter a reason for voiding this payment:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch(`/api/payments/${paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to void payment');
      }

      toast.success('Payment voided and order balance updated');
      await fetchOrderDetails();
    } catch (err: any) {
      toast.error(err.message || 'Error voiding payment');
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <Loader2 size={36} className="animate-spin mx-auto mb-3 text-[#2D5A3D]" />
        <p className="text-sm text-gray-500">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <AlertTriangle size={42} className="mx-auto mb-3 text-red-500" />
        <h2 className="text-lg font-bold text-gray-800">Order Error</h2>
        <p className="text-sm text-gray-600 my-2">{error || 'Order could not be loaded'}</p>
        <Link href="/dashboard/orders" className="btn btn-secondary inline-block mt-4 text-xs">
          Return to Orders
        </Link>
      </div>
    );
  }

  const latestInvoice = order.invoices?.[0] || null;
  const isPaid = order.payment_status === 'Paid';
  const hasDue = order.balance_due_paise > 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders"
            className="btn btn-ghost btn-icon"
            aria-label="Back to orders"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
                {order.order_number}
              </h1>
              <OrderStatusSelect
                orderId={order.id}
                currentStatus={order.order_status}
                onStatusUpdated={(s) => setOrder({ ...order, order_status: s })}
                onRequestCancel={() => setCancelModalOpen(true)}
              />
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              <span>Placed on {formatDate(order.order_date)}</span>
              <span>•</span>
              <span className={`font-semibold ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>
                {order.payment_status}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {hasDue && order.order_status !== 'Cancelled' && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold shadow-xs"
              style={{ background: '#2D5A3D' }}
            >
              <CreditCard size={15} /> Record Payment
            </button>
          )}

          <button
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
            className="btn btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5 font-semibold"
          >
            {generatingInvoice ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileText size={15} />
            )}
            {order.invoices && order.invoices.length > 0
              ? 'Update / Re-issue Invoice'
              : 'Generate Invoice'}
          </button>

          <button
            onClick={() => {
              setSelectedInvoiceForShare(latestInvoice);
              setWhatsAppModalOpen(true);
            }}
            className="btn text-xs px-3.5 py-2 flex items-center gap-1.5 font-bold text-white shadow-xs"
            style={{ background: '#25D366' }}
          >
            <MessageSquare size={15} /> WhatsApp Share
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Customer, Items, Payments, Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Delivery Card */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
              <User size={16} style={{ color: '#2D5A3D' }} />
              Customer & Delivery
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block mb-0.5">Customer Name:</span>
                <span className="text-sm font-bold text-gray-900 block">
                  {order.customer.name}
                </span>

                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`tel:${order.customer.phone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 font-semibold"
                  >
                    <Phone size={12} />
                    {formatPhone(order.customer.phone)}
                  </a>
                  <a
                    href={whatsappChatUrl(order.customer.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-white font-semibold"
                    style={{ background: '#25D366' }}
                  >
                    <MessageSquare size={12} />
                    WhatsApp
                  </a>
                </div>
              </div>

              <div>
                <span className="text-gray-500 block mb-0.5">Delivery Address:</span>
                <p className="text-xs text-gray-800 flex items-start gap-1">
                  <MapPin size={13} className="text-gray-400 mt-0.5 shrink-0" />
                  <span>{order.delivery_address || 'Customer Pickup / Not specified'}</span>
                </p>

                {order.delivery_date && (
                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-2">
                    <Calendar size={13} className="text-gray-400" />
                    <span>Delivery Date: <strong>{formatDate(order.delivery_date)}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {order.order_notes && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                <span className="font-semibold text-gray-700">Kitchen / Special Note: </span>
                <span className="text-gray-600">{order.order_notes}</span>
              </div>
            )}
          </div>

          {/* Items Table Card */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">
              Ordered Dishes & Items ({order.items?.length || 0})
            </h2>

            <div className="table-responsive">
              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dish / Product</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="text-gray-400 font-mono">{idx + 1}</td>
                      <td className="font-semibold text-gray-900">{item.product_name}</td>
                      <td className="text-center font-bold">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.selling_price_paise)}</td>
                      <td className="text-right font-bold text-gray-900">
                        {formatCurrency(item.line_total_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments History Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={16} style={{ color: '#2D5A3D' }} />
                Payment Transactions ({order.payments?.length || 0})
              </h2>
              {hasDue && order.order_status !== 'Cancelled' && (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 font-semibold"
                >
                  <Plus size={13} /> Add Payment
                </button>
              )}
            </div>

            {order.payments?.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">
                No payments have been recorded yet. Click &quot;Record Payment&quot; to register a transaction.
              </p>
            ) : (
              <div className="space-y-2">
                {order.payments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      p.is_void ? 'bg-red-50 border-red-200 opacity-75' : 'bg-[#FCFCFB] border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {formatCurrency(p.amount_paise)}
                        </span>
                        <span className="badge badge-neutral text-[10px]">
                          {p.payment_method}
                        </span>
                        {p.is_void && (
                          <span className="badge badge-error text-[10px]">
                            VOIDED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Date: {formatDate(p.payment_date)}
                        {p.transaction_reference ? ` • Ref: ${p.transaction_reference}` : ''}
                        {p.notes ? ` • Note: ${p.notes}` : ''}
                      </p>
                    </div>

                    {!p.is_void && (
                      <button
                        onClick={() => handleVoidPayment(p.id)}
                        className="text-gray-400 hover:text-red-600 text-[11px] font-semibold flex items-center gap-1 self-end sm:self-center"
                        title="Void payment"
                      >
                        <Ban size={12} /> Void
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Generated Invoices History Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FileText size={16} style={{ color: '#2D5A3D' }} />
                Generated Invoice Versions ({order.invoices?.length || 0})
              </h2>
              <button
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 font-semibold"
              >
                <RefreshCw size={13} className={generatingInvoice ? 'animate-spin' : ''} />
                Generate New Version
              </button>
            </div>

            {order.invoices?.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">
                No invoices generated yet. Click &quot;Generate Invoice&quot; above to create Version 1.
              </p>
            ) : (
              <div className="space-y-2">
                {order.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-lg border border-gray-200 bg-[#FCFCFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1E3D29]">
                          {inv.invoice_number}
                        </span>
                        <span className="badge badge-info text-[10px]">
                          v{inv.version}
                        </span>
                        <span
                          className={`badge text-[10px] ${
                            inv.payment_status === 'Paid'
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Generated on {formatDate(inv.created_at)} • Total: {formatCurrency(inv.total_paise)} • Balance: {formatCurrency(inv.balance_due_paise)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`/api/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                      >
                        <Download size={13} /> PDF
                      </a>
                      <button
                        onClick={() => {
                          setSelectedInvoiceForShare(inv);
                          setWhatsAppModalOpen(true);
                        }}
                        className="btn text-xs px-2.5 py-1.5 flex items-center gap-1 font-semibold text-white"
                        style={{ background: '#25D366' }}
                      >
                        <MessageSquare size={13} /> Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Financial Breakdown & Order Status */}
        <div className="space-y-6">
          {/* Financial Breakdown Card */}
          <div className="card p-5 space-y-3 bg-[#FCFCFB]">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">
              Payment Breakdown
            </h2>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Items Subtotal</span>
              <span className="font-semibold text-gray-800">
                {formatCurrency(order.subtotal_paise)}
              </span>
            </div>

            {order.discount_paise > 0 && (
              <div className="flex justify-between text-xs text-green-700">
                <span>Discount Applied</span>
                <span className="font-semibold">- {formatCurrency(order.discount_paise)}</span>
              </div>
            )}

            {order.delivery_charge_paise > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>Delivery Charge</span>
                <span className="font-semibold">+ {formatCurrency(order.delivery_charge_paise)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">Total Order Value</span>
              <span className="text-base font-bold text-[#1E3D29]">
                {formatCurrency(order.total_paise)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-gray-700">
              <span>Amount Received</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.amount_received_paise)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold">Outstanding Balance</span>
              <span
                className="text-base font-bold"
                style={{ color: hasDue ? '#C62828' : '#2E7D32' }}
              >
                {formatCurrency(order.balance_due_paise)}
              </span>
            </div>

            {hasDue ? (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="btn btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2 mt-4"
                style={{ background: '#2D5A3D' }}
              >
                <CreditCard size={15} /> Record Payment
              </button>
            ) : (
              <div className="p-2.5 rounded bg-green-50 text-green-800 text-xs font-semibold flex items-center gap-2 justify-center mt-3">
                <CheckCircle size={15} className="text-green-600" />
                Order Fully Paid
              </div>
            )}
          </div>

          {/* Admin Notes Card */}
          {order.admin_notes && (
            <div className="card p-4 text-xs">
              <h3 className="font-bold text-gray-700 mb-1">Internal Admin Note</h3>
              <p className="text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
                {order.admin_notes}
              </p>
            </div>
          )}

          {/* Cancellation Info */}
          {order.order_status === 'Cancelled' && (
            <div className="card p-4 text-xs bg-red-50 border-red-200">
              <h3 className="font-bold text-red-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Order Cancelled
              </h3>
              <p className="text-red-700">
                Reason: {order.cancelled_reason || 'No reason provided'}
              </p>
              {order.cancelled_at && (
                <p className="text-red-500 mt-1">
                  Cancelled on {formatDate(order.cancelled_at)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        orderId={order.id}
        orderNumber={order.order_number}
        totalPaise={order.total_paise}
        balanceDuePaise={order.balance_due_paise}
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={fetchOrderDetails}
      />

      <WhatsAppShareModal
        orderId={order.id}
        invoiceId={selectedInvoiceForShare?.id}
        customerName={order.customer.name}
        customerPhone={order.customer.phone}
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
      />

      <CancelOrderModal
        orderId={order.id}
        orderNumber={order.order_number}
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onCancelled={fetchOrderDetails}
      />
    </div>
  );
}
