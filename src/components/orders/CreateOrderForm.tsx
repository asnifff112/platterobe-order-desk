'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  User,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { today } from '@/lib/utils';
import { formatRupees } from '@/lib/utils/currency';
import type { OrderItemInput } from '@/types';

interface ItemState extends OrderItemInput {
  id: string;
}

export function CreateOrderForm() {
  const router = useRouter();

  // Customer state
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Order meta state
  const [orderDate, setOrderDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Items state
  const [items, setItems] = useState<ItemState[]>([
    {
      id: '1',
      product_name: '',
      quantity: 1,
      original_price: 0,
      selling_price: 0,
    },
  ]);

  // Pricing adjustments
  const [discount, setDiscount] = useState<string>('0');
  const [deliveryCharge, setDeliveryCharge] = useState<string>('0');
  const [submitting, setSubmitting] = useState(false);

  // Auto-lookup customer on phone blur or complete 10 digits
  async function handlePhoneLookup(phone: string) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return;

    setSearchingCustomer(true);
    try {
      const res = await fetch(`/api/customers?search=${cleaned}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.customers && data.customers.length > 0) {
          const cust = data.customers[0];
          setCustomerName(cust.name);
          if (cust.default_address && !deliveryAddress) {
            setDeliveryAddress(cust.default_address);
          }
          setIsExistingCustomer(true);
          toast.success(`Found existing customer: ${cust.name}`);
        } else {
          setIsExistingCustomer(false);
        }
      }
    } catch {
      // ignore
    } finally {
      setSearchingCustomer(false);
    }
  }

  // Items manipulation
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        product_name: '',
        quantity: 1,
        original_price: 0,
        selling_price: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      toast.error('An order must have at least one item');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof OrderItemInput, value: any) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };
        // If updating selling_price and original_price is 0 or equal, sync
        if (field === 'selling_price' && (item.original_price === 0 || item.original_price === item.selling_price)) {
          updated.original_price = value;
        }
        return updated;
      })
    );
  }

  // Calculated totals
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.selling_price || 0) * (item.quantity || 1);
  }, 0);

  const numDiscount = parseFloat(discount) || 0;
  const numDelivery = parseFloat(deliveryCharge) || 0;
  const grandTotal = Math.max(0, subtotal - numDiscount + numDelivery);

  // Form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }

    const validItems = items.filter((i) => i.product_name.trim().length > 0 && i.selling_price >= 0);
    if (validItems.length === 0) {
      toast.error('Please enter at least one product with a name and price');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        order_date: orderDate,
        delivery_date: deliveryDate || undefined,
        delivery_address: deliveryAddress.trim(),
        order_notes: orderNotes.trim(),
        admin_notes: adminNotes.trim(),
        items: validItems.map((item) => ({
          product_name: item.product_name.trim(),
          quantity: Number(item.quantity) || 1,
          original_price: Number(item.original_price) || Number(item.selling_price),
          selling_price: Number(item.selling_price),
        })),
        discount: numDiscount,
        delivery_charge: numDelivery,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      toast.success(`Order ${data.order.order_number} created successfully!`);
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error creating order');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders"
            className="btn btn-ghost btn-icon"
            aria-label="Back to orders"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1E3D29', fontFamily: 'Outfit, sans-serif' }}>
              Create New Order
            </h1>
            <p className="text-xs text-gray-500">
              Manual order entry for PLATTEROBE Order Desk
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary px-5 py-2.5 font-bold flex items-center gap-2"
          style={{ background: '#2D5A3D' }}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Save & Create Order
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer and Items (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User size={18} style={{ color: '#2D5A3D' }} />
                <h2 className="text-base font-bold text-gray-800">Customer Details</h2>
              </div>
              {isExistingCustomer && (
                <span className="badge badge-success text-[11px]">
                  Existing Customer
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer Phone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (e.target.value.replace(/\D/g, '').length >= 10) {
                        handlePhoneLookup(e.target.value);
                      }
                    }}
                    onBlur={(e) => handlePhoneLookup(e.target.value)}
                    placeholder="e.g. 9846012345"
                    className="input w-full text-sm font-medium"
                    style={{ height: '40px' }}
                  />
                  {searchingCustomer && (
                    <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  10 digits phone number. Existing records are matched automatically.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Fathima Zahra"
                  className="input w-full text-sm"
                  style={{ height: '40px' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Delivery Address / Location
                </label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Rose Villa, Near Railway Station, Parappanangadi"
                  className="input w-full text-xs p-2.5"
                />
              </div>
            </div>
          </div>

          {/* Order Items Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} style={{ color: '#2D5A3D' }} />
                <h2 className="text-base font-bold text-gray-800">Order Items</h2>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="btn btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 font-semibold"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const lineTotal = (item.selling_price || 0) * (item.quantity || 1);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-gray-200 bg-[#FCFCFB] grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Product / Dish Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.product_name}
                        onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                        placeholder="e.g. Chicken Dum Biryani"
                        className="input w-full text-xs"
                        style={{ height: '36px' }}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.selling_price === 0 ? '' : item.selling_price}
                        onChange={(e) => updateItem(item.id, 'selling_price', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="input w-full text-xs"
                        style={{ height: '36px' }}
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Qty *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="input w-full text-xs text-center"
                        style={{ height: '36px' }}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2 text-right">
                      <span className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                        Line Total
                      </span>
                      <span className="text-xs font-bold text-gray-800">
                        {formatRupees(lineTotal)}
                      </span>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-20"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-[#2D5A3D] font-bold hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add another dish / item
              </button>
              <div className="text-right">
                <span className="text-xs text-gray-500 mr-2">Items Subtotal:</span>
                <span className="text-sm font-bold text-gray-900">{formatRupees(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Summary & Meta (1 col) */}
        <div className="space-y-6">
          {/* Order Details */}
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              Order Dates & Notes
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Order Date *
              </label>
              <input
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="input w-full text-xs"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Delivery Date (optional)
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="input w-full text-xs"
                style={{ height: '38px' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kitchen / Customer Notes
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Mild spice, extra mayonnaise"
                className="input w-full text-xs p-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Admin Notes
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Private notes (not visible on invoice)"
                className="input w-full text-xs p-2"
              />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="card p-5 space-y-3 bg-[#FCFCFB]">
            <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">
              Payment Summary
            </h2>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-800">{formatRupees(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Discount (₹)</span>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input w-full text-xs text-right"
                  style={{ height: '32px' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Delivery Charge (₹)</span>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                  className="input w-full text-xs text-right"
                  style={{ height: '32px' }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">Grand Total</span>
              <span className="text-lg font-bold" style={{ color: '#2D5A3D' }}>
                {formatRupees(grandTotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-2.5 font-bold flex items-center justify-center gap-2 mt-4"
              style={{ background: '#2D5A3D' }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Confirm & Create Order
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
