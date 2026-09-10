# Hotel Surya — Hotel Operations & Management Platform

[![CI Pipeline](https://github.com/hotel-surya/hotel-surya-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/hotel-surya/hotel-surya-platform/actions/workflows/ci.yml)
[![License: Proprietary](https://img.shields.io/badge/License-All_Rights_Reserved-red.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15_App_Router-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-green)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC)](https://tailwindcss.com/)

A production-grade, internal hotel operations and management platform built specifically for **Hotel Surya**. Designed for hotel owners, managers, and front-desk receptionists to streamline live room inventory, customer registration with optional private identity documents, negotiated room rates, unified live billing (room charges + F&B + services), multiple payment settlement, atomic checkouts with zero unpaid balances, standalone expense tracking, and real-time financial analytics.

> [!NOTE]
> **Internal Operations System**: This platform is an authenticated internal hotel operations platform with **NO** public booking or customer-facing login. All business operations are protected by role-based server-side authorization.

---

## 1. Key Features

### 🛏️ Live Room Management (7 Initial Rooms)
- **Room Breakdown**: 2 AC Rooms (`101`, `102`) and 5 Non-AC Rooms (`103`, `104`, `105`, `106`, `107`).
- **Real-Time Statuses**: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `MAINTENANCE`.
- **Double-Booking Guard**: Backend database transactions prevent assigning occupied or maintenance rooms simultaneously.
- Room configuration (room number, type, maintenance notes) is editable by Owner/Manager.

### 👤 Customer & Guest Directory
- Multi-field search by Customer Name, Contact Phone, Citizenship Number, or Stay ID.
- Mandatory guest fields: Full name, gender (`MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY`), phone number.
- **Optional Citizenship Verification**: Allows mobile camera capture or photo upload. If omitted, check-in proceeds without friction.
- **Private Storage**: Citizenship photos and receipts are stored outside public web directories and served exclusively via authenticated, non-cached API streams (`/api/uploads/...`).

### 🛎️ Check-in & Negotiated Pricing
- Select existing customer or register a new customer inline.
- Collects **Number of People Staying** and optional accompanying guest profiles (Name & Gender).
- **Negotiated Room Price**: Manually entered for each stay and permanently preserved on that historical stay record (price changes in catalog never alter old bills).
- **Automatic Server Timestamps**: Check-in and checkout timestamps are generated automatically by the server in Nepal Time (`Asia/Kathmandu`, UTC+5:45).
- Optional prepayment collection at check-in (Cash, QR, Bank Transfer, Card).

### 🧾 Unified Live Customer Bill
- **One Live Bill per Stay**: Consolidates room charges, kitchen food, bar drinks, laundry, room service, and extra rollaway beds into a single real-time ledger.
- **Service Catalog**: Quick-pick menu for popular items (Momo, Chowmein, Dal Bhat, Coke, Masala Tea, Laundry) with unit price overrides at point-of-sale.
- **Multiple Split Payments**: Record payments over time without overwriting previous transactions.
- **Mathematical Formula**:
  $$\text{Total} = \text{Room Charge} + \sum \text{Bill Items}$$
  $$\text{Paid} = \sum \text{All Recorded Payments}$$
  $$\text{Balance} = \text{Total} - \text{Paid}$$

### 🚪 Atomic Checkout Workflow
- Dedicated checkout screen itemizing all charges and payments.
- **Unpaid Balance Enforcement**: Standard checkout is blocked if $\text{Balance} > 0$. Staff can collect the remaining balance with 1-click inline settlement.
- Controlled Owner/Manager override with mandatory audit justification.
- On completion: Database `$transaction` marks stay `CHECKED_OUT`, automatically sets `checkoutAt`, frees room back to `AVAILABLE`, and writes an immutable audit record.

### 💸 Categorized Hotel Expenses
- Completely decoupled from customer bills.
- Categorized outflows: Salaries, Kitchen Groceries, Electricity (NEA), Water, Wi-Fi Internet, Cooking Gas (LPG), Maintenance, Supplies, Transportation, Rent.
- Optional receipt attachment with camera upload.
- Filter by category and date range with CSV export.

### 📊 Financial Overview & Analytics
- Live dashboard metrics: Room occupancy rate, in-house guest headcount, today/weekly/monthly revenue, monthly expenses, and net operational result ($\text{Revenue} - \text{Expenses}$).
- Recharts visualizations: Revenue vs Expenses comparison bar chart, category pie chart, and room utilization bar chart.
- Global Command Palette (`Ctrl + K`) for instant navigation and record lookup.

### 🔒 Enterprise Security & Audit Logging
- HTTP-only secure session cookies signed with `jose` (JWT).
- Password hashing with `bcryptjs` (salt rounds = 10).
- In-memory sliding window rate limiting on authentication routes.
- Immutable audit log recording user, action, entity, entity ID, metadata, and timestamps for all operational and financial events.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions & Route Handlers) |
| **Language** | TypeScript (Strict Mode) |
| **Styling & UI** | Tailwind CSS, Radix UI Primitives, Lucide Icons, Class Variance Authority |
| **Theme** | Next Themes (Light, Dark, and System Mode) |
| **Notifications** | Sonner Toast Provider |
| **Data Visualization** | Recharts (Responsive SVG Charts) |
| **Form Validation** | Zod Schema Validation, React Hook Form |
| **Database & ORM** | PostgreSQL 16 (Production) / SQLite (Zero-Config Local Dev), Prisma ORM |
| **Testing** | Vitest (Unit & End-to-End Operational Workflows) |
| **Timezone** | `Asia/Kathmandu` (Nepal Standard Time, UTC+5:45) |

---

## 3. Architecture Diagram

```mermaid
flowchart TD
    User([Hotel Staff / Receptionist / Owner]) -->|HTTPS / Mobile Browser| UI[Next.js 15 Presentation Layer]
    UI -->|Theme / Navigation / Modals| AppShell[App Shell + Dark/Light Theme]
    UI -->|Global Search| CmdK[Ctrl+K Command Palette]

    subgraph Server Layer
        UI -->|Fetch / REST API| API[Next.js Route Handlers /api/*]
        API --> Auth[Auth & Session Layer - jose JWT + bcrypt]
        API --> RBAC[Role-Based Access Control]
        API --> Storage[Private File Storage /api/uploads/*]
        
        subgraph Business Services
            RoomService[Room Service - Double Booking Guard]
            CustomerService[Customer Service - Search & Profile]
            StayService[Stay Service - Atomic Checkin & Checkout]
            BillingService[Billing Engine - Formula & Precision]
            ExpenseService[Expense Service - Categorized Outflows]
            AnalyticsService[Analytics Service - KPIs & Occupancy]
            AuditService[Audit Service - Event Logger]
        end

        API --> BusinessServices
    end

    subgraph Data Persistence
        BusinessServices -->|Prisma Transactions $transaction| DB[(PostgreSQL / SQLite Database)]
        Storage -->|Encrypted / Protected Files| FileSystem[(Private Local / S3 Storage)]
    end
```

---

## 4. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Stay : "creates"
    User ||--o{ Payment : "records"
    User ||--o{ Expense : "creates"
    User ||--o{ BillItem : "adds"
    User ||--o{ AuditLog : "logs"

    Room ||--o{ Stay : "hosts"
    Customer ||--o{ Stay : "stays"
    Stay ||--o{ AccompanyingGuest : "includes"
    Stay ||--o{ BillItem : "has charges"
    Stay ||--o{ Payment : "receives"

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        string role
        boolean isActive
    }

    Room {
        string id PK
        string roomNumber UK
        string type
        string status
        string notes
    }

    Customer {
        string id PK
        string fullName
        string gender
        string citizenshipNumber
        string citizenshipPhotoUrl
        string contactNumber
        string address
    }

    Stay {
        string id PK
        string customerId FK
        string roomId FK
        int numberOfPeople
        datetime checkInAt
        datetime checkoutAt
        float roomPrice
        string status
    }

    BillItem {
        string id PK
        string stayId FK
        string category
        string name
        int quantity
        float unitPrice
        float total
    }

    Payment {
        string id PK
        string stayId FK
        float amount
        string method
        datetime timestamp
        string idempotencyKey UK
    }

    Expense {
        string id PK
        string title
        float amount
        string category
        datetime date
        string paymentMethod
        string receiptUrl
    }

    AuditLog {
        string id PK
        string userId FK
        string action
        string entity
        string metadata
        datetime timestamp
    }
```

---

## 5. User Roles & Permissions (RBAC)

| Role | Dashboard | Rooms | Customers | Check-in / Checkout | Live Bills & Payments | Expenses | Analytics & Reports | Staff Management | Audit Logs |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Full) | ✅ | ✅ | ✅ |
| **MANAGER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Full) | ✅ | ❌ | ✅ |
| **RECEPTIONIST** | ✅ | ✅ | ✅ | ✅ | ✅ | View / Add | ❌ | ❌ | ❌ |

---

## 6. Demo Accounts for Evaluation

The database is pre-seeded with realistic Hotel Surya accounts. The login screen also contains one-click quick-fill buttons for fast testing:

| Role | Email Address | Password | Privileges |
|---|---|---|---|
| **Owner** | `owner@hotelsurya.com` | `SuryaOwner@2026` | Full administrative & staff control |
| **Manager** | `manager@hotelsurya.com` | `SuryaManager@2026` | Operations, analytics & audit view |
| **Receptionist** | `reception@hotelsurya.com` | `SuryaReception@2026` | Front-desk check-in, orders & payments |

---

## 7. Quick Start & Running Locally

### Option A: Zero-Config Local Mode (SQLite)

No Docker or external database required! Get running in under 60 seconds:

```bash
# 1. Clone repository
git clone https://github.com/hotel-surya/hotel-surya-platform.git
cd hotel-surya-platform

# 2. Install dependencies
npm install

# 3. Setup local database and seed demo data
npm run db:sqlite

# 4. Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Production PostgreSQL Mode (Docker)

To run the complete production stack with PostgreSQL 16:

```bash
# 1. Start PostgreSQL container
docker-compose up -d postgres

# 2. Configure environment variables (.env)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/hotelsurya?schema=public"

# 3. Push schema and seed database
npm run db:postgres
npx prisma db push
npm run prisma:seed

# 4. Start application
npm run dev
```

---

## 8. Automated Testing & Verification

Run the comprehensive Vitest test suites covering billing math, role authorization, and the critical end-to-end guest lifecycle:

```bash
# Run unit & integration test suites
npm test

# Run TypeScript typechecker
npm run typecheck

# Run production build
npm run build
```

### Verified Test Workflows:
1. **Billing Engine**: Room rate + food + drinks + services − multiple split payments = balance.
2. **Double-Booking Guard**: Prevents concurrent or duplicate room assignments at the database level.
3. **Checkout Balance Rule**: Rejects checkout attempt if $\text{Balance} > 0$ until full settlement is collected.
4. **Room Status Lifecycle**: Room transitions from `AVAILABLE` $\rightarrow$ `OCCUPIED` upon check-in, and automatically resets to `AVAILABLE` upon successful checkout.
5. **RBAC Security**: Server-side validation blocks unauthorized staff modifications.

---

## 9. Deployment Guide (Vercel + Neon / Supabase PostgreSQL)

1. Create a serverless PostgreSQL database on [Neon](https://neon.tech/) or [Supabase](https://supabase.com/).
2. In your Vercel project settings, configure the following Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL pooled connection string.
   - `AUTH_SECRET`: A secure 32+ character random string.
   - `NEXT_PUBLIC_APP_URL`: Your production URL (`https://your-domain.vercel.app`).
   - `PRIVATE_STORAGE_PATH`: `./storage/private`
3. Set the build command to:
   ```bash
   npx prisma generate && next build
   ```
4. Deploy!

---

## 10. Future Roadmap

While Hotel Surya operates as an internal operations platform, the clean service-oriented architecture allows future modular extensions:
- [ ] Restaurant POS thermal printer integration (ESC/POS).
- [ ] Automated guest WhatsApp check-in confirmations and digital receipts.
- [ ] Multi-property hotel chain management.
- [ ] QR code digital room service menus.
- [ ] Cloud backup integration with AWS S3 / Supabase Storage.

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
