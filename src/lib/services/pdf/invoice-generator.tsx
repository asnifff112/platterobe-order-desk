import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import { formatRupees, paiseToRupees, amountInWords } from '@/lib/utils/currency';
import { formatPhone } from '@/lib/utils/phone';
import { formatDate } from '@/lib/utils';
import type {
  OrderWithDetails,
  BusinessSettings,
} from '@/types';

// PDF Stylesheet with PLATTEROBE Brand Theme
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    color: '#2A2A2A',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2D5A3D',
    paddingBottom: 16,
    marginBottom: 18,
  },
  brandBlock: {
    maxWidth: 280,
  },
  brandTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: '#2D5A3D',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  brandSubtitle: {
    fontSize: 8.5,
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  brandAddress: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.35,
  },
  invoiceMetaBlock: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: '#1E3D29',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 6,
    alignSelf: 'flex-end',
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgePending: {
    backgroundColor: '#FFF8E1',
  },
  statusBadgePartial: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusTextPaid: {
    color: '#2E7D32',
  },
  statusTextPending: {
    color: '#E65100',
  },
  statusTextPartial: {
    color: '#EF6C00',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 8,
    color: '#777777',
    width: 70,
    textAlign: 'right',
    marginRight: 6,
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#2A2A2A',
    width: 80,
    textAlign: 'right',
  },

  // Bill To & Ship To
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F6',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  infoCol: {
    width: '48%',
  },
  infoSectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#2D5A3D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  customerName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  customerText: {
    fontSize: 8.5,
    color: '#555555',
    lineHeight: 1.35,
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2D5A3D',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  th: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.75,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#FAF9F6',
  },
  colIndex: { width: '6%', textAlign: 'center' },
  colDesc: { width: '50%' },
  colQty: { width: '12%', textAlign: 'center' },
  colPrice: { width: '16%', textAlign: 'right' },
  colTotal: { width: '16%', textAlign: 'right' },

  // Summary section
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 16,
  },
  wordsBlock: {
    width: '52%',
    paddingRight: 10,
  },
  wordsLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#777777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  wordsText: {
    fontStyle: 'italic',
    fontSize: 8.5,
    color: '#444444',
    lineHeight: 1.3,
  },
  paymentSnapshotBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 3,
    backgroundColor: '#F7F7F7',
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
  },
  paymentSnapshotTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#2D5A3D',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  paymentSnapshotText: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.35,
  },
  totalsBlock: {
    width: '44%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
  },
  totalsLabel: {
    fontSize: 8.5,
    color: '#666666',
  },
  totalsValue: {
    fontSize: 8.5,
    color: '#2A2A2A',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#2D5A3D',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2D5A3D',
    paddingVertical: 5,
    marginTop: 4,
    marginBottom: 4,
  },
  grandTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1E3D29',
  },
  grandTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#2D5A3D',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  balanceDueText: {
    fontFamily: 'Helvetica-Bold',
    color: '#C62828',
  },

  // Footer & Signatory
  footerSection: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.75,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerNotes: {
    width: '60%',
    fontSize: 7.5,
    color: '#777777',
    lineHeight: 1.3,
  },
  signatoryBlock: {
    width: '35%',
    alignItems: 'center',
  },
  signatoryLine: {
    width: 120,
    borderTopWidth: 0.75,
    borderTopColor: '#999999',
    marginTop: 24,
    marginBottom: 3,
  },
  signatoryText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#555555',
    textTransform: 'uppercase',
  },
});

export interface InvoicePDFProps {
  order: OrderWithDetails;
  settings?: Partial<BusinessSettings> | null;
  invoiceNumber: string;
  version: number;
  paymentSnapshot?: {
    payment_status: string;
    amount_received_paise: number;
    balance_due_paise: number;
    payment_date?: string | null;
    payment_method?: string | null;
  };
}

export const InvoiceDocument: React.FC<InvoicePDFProps> = ({
  order,
  settings,
  invoiceNumber,
  version,
  paymentSnapshot,
}) => {
  const businessName = settings?.business_name || 'PLATTEROBE';
  const businessSubtitle = settings?.store_display_name || 'Gourmet & Catering';
  const businessAddress = settings?.address || 'Main Road, Parappanangadi, Kerala, India';
  const businessPhone = settings?.phone || '+91 98460 12345';
  const businessFooter = settings?.invoice_footer || 'Thank you for choosing PLATTEROBE! Enjoy your meal.';
  const signatoryName = settings?.signatory_name || 'Authorized Signatory';

  const subtotalRupees = paiseToRupees(order.subtotal_paise);
  const discountRupees = paiseToRupees(order.discount_paise);
  const deliveryRupees = paiseToRupees(order.delivery_charge_paise);
  const totalRupees = paiseToRupees(order.total_paise);

  const paymentStatus = paymentSnapshot?.payment_status || order.payment_status;
  const receivedPaise = paymentSnapshot?.amount_received_paise ?? order.amount_received_paise;
  const balancePaise = paymentSnapshot?.balance_due_paise ?? order.balance_due_paise;
  const receivedRupees = paiseToRupees(receivedPaise);
  const balanceRupees = paiseToRupees(balancePaise);

  const isPaid = paymentStatus === 'Paid';
  const isPartial = paymentStatus === 'Partially Paid';

  const statusBadgeStyle = isPaid
    ? [styles.statusBadge, styles.statusBadgePaid]
    : isPartial
    ? [styles.statusBadge, styles.statusBadgePartial]
    : [styles.statusBadge, styles.statusBadgePending];

  const statusTextStyle = isPaid
    ? [styles.statusText, styles.statusTextPaid]
    : isPartial
    ? [styles.statusText, styles.statusTextPartial]
    : [styles.statusText, styles.statusTextPending];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>{businessName}</Text>
            <Text style={styles.brandSubtitle}>{businessSubtitle}</Text>
            <Text style={styles.brandAddress}>{businessAddress}</Text>
            <Text style={styles.brandAddress}>Phone: {businessPhone}</Text>
          </View>

          <View style={styles.invoiceMetaBlock}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <View style={statusBadgeStyle}>
              <Text style={statusTextStyle}>{paymentStatus}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaValue}>{invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Version:</Text>
              <Text style={styles.metaValue}>v{version}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(order.order_date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order No:</Text>
              <Text style={styles.metaValue}>{order.order_number}</Text>
            </View>
          </View>
        </View>

        {/* Customer & Delivery Information */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoSectionTitle}>Billed To</Text>
            <Text style={styles.customerName}>{order.customer.name}</Text>
            <Text style={styles.customerText}>
              Phone: {formatPhone(order.customer.phone)}
            </Text>
            {order.customer.email ? (
              <Text style={styles.customerText}>Email: {order.customer.email}</Text>
            ) : null}
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.infoSectionTitle}>Delivery Address</Text>
            <Text style={styles.customerText}>
              {order.delivery_address || order.customer.default_address || 'Customer Pickup / Parappanangadi'}
            </Text>
            {order.delivery_date ? (
              <Text style={[styles.customerText, { marginTop: 4 }]}>
                Delivery Date: {formatDate(order.delivery_date)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Itemized Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colIndex]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colPrice]}>Rate</Text>
            <Text style={[styles.th, styles.colTotal]}>Amount</Text>
          </View>

          {order.items.map((item, index) => {
            const isEven = index % 2 === 1;
            const itemPrice = paiseToRupees(item.selling_price_paise);
            const itemTotal = paiseToRupees(item.line_total_paise);

            return (
              <View
                key={item.id || index}
                style={[styles.tableRow, isEven ? styles.tableRowEven : {}]}
              >
                <Text style={styles.colIndex}>{index + 1}</Text>
                <Text style={styles.colDesc}>{item.product_name}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatRupees(itemPrice)}</Text>
                <Text style={styles.colTotal}>{formatRupees(itemTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary & Amount in Words */}
        <View style={styles.summaryContainer}>
          <View style={styles.wordsBlock}>
            <Text style={styles.wordsLabel}>Amount in Words:</Text>
            <Text style={styles.wordsText}>
              {amountInWords(order.total_paise)}
            </Text>

            {/* Payment snapshot */}
            <View style={styles.paymentSnapshotBox}>
              <Text style={styles.paymentSnapshotTitle}>Payment Summary</Text>
              <Text style={styles.paymentSnapshotText}>
                Status: {paymentStatus}
              </Text>
              <Text style={styles.paymentSnapshotText}>
                Amount Received: {formatRupees(receivedRupees)}
              </Text>
              {paymentSnapshot?.payment_method ? (
                <Text style={styles.paymentSnapshotText}>
                  Method: {paymentSnapshot.payment_method}
                  {paymentSnapshot.payment_date ? ` (${formatDate(paymentSnapshot.payment_date)})` : ''}
                </Text>
              ) : null}
              {balanceRupees > 0 ? (
                <Text style={[styles.paymentSnapshotText, styles.balanceDueText]}>
                  Remaining Balance: {formatRupees(balanceRupees)}
                </Text>
              ) : (
                <Text style={[styles.paymentSnapshotText, { color: '#2E7D32', fontFamily: 'Helvetica-Bold' }]}>
                  Payment Cleared in Full
                </Text>
              )}
            </View>
          </View>

          {/* Totals Breakdown */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatRupees(subtotalRupees)}</Text>
            </View>

            {discountRupees > 0 && (
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, { color: '#2E7D32' }]}>Discount</Text>
                <Text style={[styles.totalsValue, { color: '#2E7D32' }]}>
                  - {formatRupees(discountRupees)}
                </Text>
              </View>
            )}

            {deliveryRupees > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Delivery Charge</Text>
                <Text style={styles.totalsValue}>+ {formatRupees(deliveryRupees)}</Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatRupees(totalRupees)}</Text>
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Paid Amount</Text>
              <Text style={styles.totalsValue}>{formatRupees(receivedRupees)}</Text>
            </View>

            <View style={styles.balanceRow}>
              <Text style={[styles.totalsLabel, balanceRupees > 0 ? styles.balanceDueText : {}]}>
                Balance Due
              </Text>
              <Text style={[styles.totalsValue, balanceRupees > 0 ? styles.balanceDueText : {}]}>
                {formatRupees(balanceRupees)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Notes & Signatory */}
        <View style={styles.footerSection}>
          <View style={styles.footerRow}>
            <View style={styles.footerNotes}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                Notes & Terms:
              </Text>
              <Text>{businessFooter}</Text>
              {order.order_notes ? (
                <Text style={{ marginTop: 2 }}>Special instruction: {order.order_notes}</Text>
              ) : null}
            </View>

            <View style={styles.signatoryBlock}>
              <View style={styles.signatoryLine} />
              <Text style={styles.signatoryText}>{signatoryName}</Text>
              <Text style={{ fontSize: 7, color: '#888888' }}>{businessName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generate PDF Buffer for an invoice
 */
export async function generateInvoicePDFBuffer(props: InvoicePDFProps): Promise<Buffer> {
  const doc = React.createElement(InvoiceDocument, props);
  const buffer = await renderToBuffer(doc as any);
  return buffer;
}
