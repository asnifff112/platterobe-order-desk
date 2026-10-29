# PLATTEROBE ORDER DESK

> **Private Business Administration Dashboard for PLATTEROBE**  
> Gourmet & Catering • Parappanangadi, Malappuram, Kerala, India

---

## 📖 Overview

**PLATTEROBE ORDER DESK** is a production-grade full-stack web application custom-built for managing manual customer food orders, tracking payments, auto-generating tax-compliant PDF invoices, recording operating expenses, and sharing invoices directly with customers via WhatsApp.

All monetary values are calculated and persisted strictly as integer **paise** (1 INR = 100 paise) to prevent floating-point rounding errors.

---

## 🛠️ Technology Stack

- **Framework:** Next.js (App Router, Turbopack)
- **Frontend:** React, TypeScript (strict mode), Tailwind CSS, Lucide Icons, Sonner (toasts)
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Storage)
- **PDF Generation:** `@react-pdf/renderer` (custom branded PDF documents with version snapshots)
- **Validation:** Zod schemas
- **Testing:** Vitest, Testing Library

---

## ✨ Features

1. **Dashboard Overview:**
   - Real-time KPIs: Gross Sales, Payments Collected, Outstanding Receivables, Today's Orders, Paid Orders count.
   - Quick CTA links to New Order, Invoices, and Payments.
   - Recent orders live table.

2. **Customer & Order Management:**
   - Auto-lookup existing customer by phone number (+91 normalization).
   - Dynamic multi-row dish/product entry with live calculations (Quantity × Selling Price = Line Total).
   - Automatic discounts, delivery charges, and grand total calculations.
   - Order Status workflow: `New` → `Confirmed` → `Preparing` → `Ready for Delivery` → `Out for Delivery` → `Delivered` → `Cancelled` (with cancellation reason).

3. **Tax Invoice PDF Generation & Versioning:**
   - Custom PLATTEROBE branded layout (Deep Green `#2D5A3D`, Warm White `#F9F9F6`, Charcoal text).
   - Includes Itemized dishes, Rates, Qty, Discounts, Delivery Fee, Total, and Amount in Indian Words (Lakhs, Crores, Rupees, Paise).
   - Payment status badge (`PAID`, `PARTIALLY PAID`, `PENDING`).
   - Payment summary snapshot (Method, Date, UTR Ref, Amount Paid, Balance Due).
   - Version history preserved (`v1` pending, `v2` paid).

4. **Payments Ledger & Idempotency:**
   - Dedicated Payments Ledger with filter by method (`UPI`, `Cash`, `Bank Transfer`, `Online Payment`, `Other`).
   - Idempotency key protection preventing duplicate payment submissions.
   - Instant balance due recalculation upon recording or voiding a payment.

5. **WhatsApp Integration:**
   - **Zero-Config Manual Sharing:** Generates direct click-to-chat links (`https://wa.me/...`) with pre-composed cordial messages including order summary, invoice breakdown, and UPI details.
   - **Official Meta WhatsApp Cloud API:** Automated dispatch of document invoices when credentials are provided in `.env.local`.

6. **Expenses Tracking:**
   - Categorized operating cost tracking: `Ingredients`, `Packaging`, `Delivery`, `Marketing`, `Equipment`, `Utilities`, `Website`, `Other`.
   - Real-time filtered expenses summary.

7. **Reports & Exports:**
   - Monthly and Daily Sales performance table (excluding cancelled orders).
   - Pending Receivables list sorted by balance due.
   - One-click CSV exports for **Orders**, **Payments**, and **Expenses** with date range filters.

8. **Settings & Customization:**
   - Store details (Parappanangadi address, contact phone, email).
   - Prefix configuration (e.g. `INV`, `ORD`).
   - Signatory name and footer notes.
   - Toggles for delivery address and original price display.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.18+ or 20+
- A Supabase project (Free or Pro)

### 2. Installation
```bash
git clone <repo-url>
cd platterobedashboard
npm install
```

### 3. Database Setup (Supabase)
1. Open your project on [Supabase Dashboard](https://database.new).
2. Go to the **SQL Editor**.
3. Run the complete schema script located at:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
   This creates all tables, triggers, indexes, and Row Level Security policies.
4. *(Optional)* Run the demo seed script located at:
   ```
   supabase/seed.sql
   ```
   This populates sample orders, customers in Parappanangadi, payments, and expenses.

### 4. Create First Administrator
1. Go to **Authentication > Users** in Supabase and click **Add User** (e.g., `admin@platterobe.com`).
2. Run this query in the SQL Editor to promote the user to admin:
   ```sql
   INSERT INTO admin_profiles (id, email, full_name, role)
   VALUES ('<USER_UUID_FROM_AUTH_USERS>', 'admin@platterobe.com', 'Admin Manager', 'super_admin');
   ```

### 5. Private Storage Bucket Setup
1. In the Supabase Dashboard, go to **Storage > Buckets**.
2. Create a **Private** bucket named `invoices`.
3. Add a policy granting authenticated users full access (`SELECT`, `INSERT`, `UPDATE`).

### 6. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_URL=http://localhost:3000

# Optional WhatsApp Business Cloud API
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v21.0
```

### 7. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). The app will redirect you to `/login`.

---

## 🧪 Testing & Verification

Run the automated test suite with Vitest:
```bash
npm test
```
*Executes unit and integration tests covering currency conversions, Indian numbering words, phone normalization, order calculations, payment status transitions, WhatsApp formatting, and PDF buffer generation.*

Run lint checks:
```bash
npm run lint
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```

Build for production:
```bash
npm run build
```

---

## 🌐 Deployment to Vercel

1. Push your repository to GitHub or GitLab.
2. In Vercel, click **New Project** and import the repository.
3. Configure the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL` (set to your Vercel production URL, e.g. `https://platterobe.vercel.app`)
   - `WHATSAPP_ACCESS_TOKEN` (optional)
   - `WHATSAPP_PHONE_NUMBER_ID` (optional)
4. Click **Deploy**.

---

## 🔒 Security & Privacy

- **Row Level Security (RLS):** Enforced on all tables (`orders`, `order_items`, `customers`, `payments`, `invoices`, `expenses`).
- **Private Keys:** Service role keys are never exposed with `NEXT_PUBLIC_` prefixes.
- **Invoices Storage:** Stored in a private Supabase bucket and served through authenticated Next.js endpoints.

---

## 📞 Support & Inquiries

**PLATTEROBE**  
Main Road, Parappanangadi, Malappuram, Kerala 676303  
Phone: +91 98460 12345 • Email: `orders@platterobe.com`
