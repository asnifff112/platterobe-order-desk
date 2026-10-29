'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, Send, Copy, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { formatPhone } from '@/lib/utils/phone';

interface WhatsAppShareModalProps {
  orderId: string;
  orderNumber?: string;
  invoiceId?: string;
  customerName: string;
  customerPhone: string;
  defaultMessage?: string;
  hasCloudApi?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppShareModal({
  orderId,
  invoiceId,
  customerName,
  customerPhone,
  defaultMessage = '',
  hasCloudApi = false,
  isOpen,
  onClose,
}: WhatsAppShareModalProps) {
  const [message, setMessage] = useState<string>(defaultMessage);
  const [sendingCloud, setSendingCloud] = useState<boolean>(false);

  if (!isOpen) return null;

  function handleOpenWhatsApp() {
    // Recalculate manual link with potentially edited message
    const phoneClean = customerPhone.replace(/[^\d]/g, '');
    const finalPhone = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp...');
    onClose();
  }

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Message copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }

  async function handleSendViaCloudApi() {
    setSendingCloud(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          invoice_id: invoiceId,
          custom_message: message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send WhatsApp message via Cloud API');
      }

      toast.success('WhatsApp message sent directly to customer!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Cloud API failed, try manual sharing');
    } finally {
      setSendingCloud(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="card w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200"
        style={{ background: '#FFFFFF', borderRadius: '12px' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#E8F5E9', color: '#2E7D32' }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1E3D29' }}>
              Share via WhatsApp
            </h2>
            <p className="text-xs text-gray-500">
              Sending to <span className="font-semibold text-gray-700">{customerName}</span> ({formatPhone(customerPhone)})
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-700">
              Message Preview / Editable Text:
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800"
            >
              <Copy size={13} /> Copy Text
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className="input w-full font-mono text-xs p-3 leading-relaxed"
            style={{ background: '#FBFBFA', borderRadius: '6px' }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {hasCloudApi && (
            <button
              type="button"
              onClick={handleSendViaCloudApi}
              disabled={sendingCloud}
              className="btn btn-secondary text-xs px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {sendingCloud ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send via Cloud API
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs px-4 py-2 flex-1 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="btn text-xs px-5 py-2.5 font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none"
              style={{ background: '#25D366', color: '#FFFFFF' }}
            >
              <ExternalLink size={15} />
              Open in WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
