# TYPnex — Secure Communication & Management Platform

TYPnex is a secure, high-performance communication platform designed for direct user-to-owner messaging, multi-tier staff administration, file sharing, and automated multilingual translation.

---

## 🌟 Key Features

1. **Strict User-to-Owner Messaging Architecture**:
   - Normal users only message the platform owner / support desk.
   - Users cannot see, browse, or contact other users.
   - Employees manage assigned user tickets and conversations based on specific administrative permissions.

2. **Authentication & Security**:
   - Email/password registration with 6-digit email OTP verification.
   - Google OAuth 2.0 integration.
   - Tamper-proof HTTP-only JWT sessions.
   - Role-Based Access Control (RBAC): `USER`, `EMPLOYEE`, `ADMIN`.
   - Admin-exclusive Blue Tick verification badge granting unlimited daily quotas.
   - Immediate user blocking with server-side enforcement.
   - Automatic rate limiting & brute-force mitigation on authentication endpoints.

3. **Daily Quotas & IST Midnight Cycle**:
   - Non-verified users receive 100 messages and 20 file uploads per calendar day.
   - Quotas reset daily at **12:00 AM IST (Asia/Kolkata)**.
   - Blue Tick verified users enjoy unlimited quotas.

4. **Private Storage & Content Security**:
   - Files are stored privately (local private directory or private Supabase Storage bucket).
   - Never exposed via public static directories (`public/uploads`).
   - Downloads protected by expiring HMAC-signed URLs.
   - **Video files are strictly prohibited** (MP4, MOV, MKV, AVI, etc.).
   - Executable binaries & scripts blocked (.exe, .bat, .ps1, .apk, etc.) with heuristic magic-byte PE inspection.
   - Maximum upload size capped at 20 MB.

5. **Integrated Media & Voice**:
   - Real-time in-browser microphone voice notes recording with waveform player.
   - Live camera snapshot capture with camera switching.
   - Image preview modal and document attachment management.

6. **Monetization & Ads**:
   - Non-intrusive banner ads and interstitial ad gates displayed exclusively to regular users (`USER`).
   - Admin and Employee dashboards remain 100% ad-free.

7. **Multilingual Translation**:
   - Translation with support for English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, and Malayalam.
   - Built-in localized lexicon fallback for instant offline/dev translation and zero latency.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- Optional: PostgreSQL / Supabase database (a resilient in-memory fallback is active for offline development and testing)

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

Edit `.env` to configure your settings:
- `DATABASE_URL`: PostgreSQL connection string (or Supabase pooled connection).
- `JWT_SECRET`: Random 64-character secret key.
- `DEFAULT_ADMIN_PASSWORD`: Strong password for the initial admin account.
- `DEFAULT_EMPLOYEE_PASSWORD`: Strong password for the initial employee account.
- (Optional) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for Supabase cloud storage.
- (Optional) `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` for Google OAuth.
- (Optional) `EMAIL_PROVIDER_KEY` for transactional email delivery.

### 3. Install Dependencies
```bash
npm install
```

### 4. Validate Database Schema
```bash
npx prisma validate
```

### 5. Run Verification & Automated Tests
Execute the comprehensive test suites:
```bash
# Core logic, auth, quotas, malware scanning, storage tests
npm test

# Production build validation
npm run build

# Live endpoint & RBAC security audit (requires server running on localhost:3000)
npm run test:security
```

### 6. Development Server
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Accounts (First Run / Dev)

Upon first run, the system automatically seeds administrative accounts:
- **System Administrator**: `admin@typnex.com` / `AdminPass@2026` (Portal: `/department/login`)
- **Staff Employee**: `employee@typnex.com` / `EmployeePass@2026` (Portal: `/department/login`)

> **Important**: Update these default passwords immediately after initial deployment via the Admin Settings console or `.env`.

---

## 📦 Deployment Guide

### Deploying to Production (Vercel / VPS / Docker)

1. **Database Setup**:
   - Provision a PostgreSQL database on Supabase, Neon, or AWS RDS.
   - Apply Prisma migrations:
     ```bash
     npx prisma migrate deploy
     ```
   - Run Prisma client generation:
     ```bash
     npx prisma generate
     ```

2. **Environment Variables**:
   - Set all production environment variables listed in `.env.example` in your hosting dashboard.
   - Ensure `NODE_ENV=production` and `NEXT_PUBLIC_APP_URL` points to your public domain (e.g. `https://typnex.com`).

3. **Build & Start**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🛡️ License
Private & Proprietary. All rights reserved by TYPnex.
