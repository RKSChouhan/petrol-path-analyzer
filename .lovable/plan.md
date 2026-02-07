

# Multi-Tenant Conversion Plan

## Overview

Convert the current single-company fuel station app into a multi-tenant platform where 10+ companies can each have their own isolated data, settings, branding, and role passwords -- all within the same application.

---

## Phase 1: Database Foundation

### 1.1 Create `companies` table

A new table to store each company's profile and settings:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Company identifier |
| name | text | Company display name |
| logo_url | text | URL to company logo (optional) |
| contact_phone | text | Owner's contact phone |
| petrol_price | numeric | Default petrol price per litre |
| diesel_price | numeric | Default diesel price per litre |
| pump_count_petrol | integer | Number of petrol pumps (1-4) |
| pump_count_diesel | integer | Number of diesel pumps (1-4) |
| default_expenses | jsonb | Array of default expense names |
| default_debtors | jsonb | Array of default debtor names |
| supervisor_password | text | Supervisor role password |
| proprietor_password | text | Proprietor role password |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

RLS: Only authenticated users who belong to the company (via `user_companies` mapping) can view/edit their company.

### 1.2 Create `user_companies` mapping table

Links users to their company:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Row identifier |
| user_id | uuid | References auth.users |
| company_id | uuid | References companies |
| created_at | timestamptz | When the user was added |

Each user belongs to exactly one company (separate accounts per company).

### 1.3 Add `company_id` to ALL data tables

Add a `company_id` column (UUID, NOT NULL, references `companies.id`) to these 14 tables:

- daily_sales
- pump_readings (via daily_sales join or directly)
- payment_methods (via daily_sales join or directly)
- cash_denominations (via daily_sales join or directly)
- oil_sales (via daily_sales join or directly)
- expenses (via daily_sales join or directly)
- debtors (via daily_sales join or directly)
- repaid_debtors (via daily_sales join or directly)
- storage_readings
- employees
- daily_attendance (via daily_sales join)
- fiserv_bills
- bharat_fleet_bills
- debtor_ledger
- lock_settings

For child tables that already reference `daily_sales` via `daily_sales_id`, the `company_id` is inherited through that relationship. We will add `company_id` directly only to top-level tables: `daily_sales`, `storage_readings`, `employees`, `fiserv_bills`, `bharat_fleet_bills`, `debtor_ledger`, and `lock_settings`.

### 1.4 Migrate existing data

- Create a company record for "Sri MahaLingam Agency" with current settings (petrol price 101.88, diesel price 93.48, etc.)
- Set `company_id` on all existing rows to this company's ID
- Make `company_id` NOT NULL after migration

### 1.5 Update RLS policies

All RLS policies will be updated to check that the user belongs to the company whose data they are accessing, using a helper function:

```sql
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = auth.uid()
  LIMIT 1
$$;
```

Policies will use `company_id = user_company_id()` instead of the old `user_id` checks.

### 1.6 Remove the fixed STATION_ID pattern

The hardcoded `00000000-0000-0000-0000-000000000001` will be replaced with `company_id` everywhere. The `user_id` column on `daily_sales` and `storage_readings` will be repurposed or removed since company_id now identifies the data owner.

---

## Phase 2: Authentication and Company Setup

### 2.1 Update Login Flow

The login page will:
1. User signs in with email/password (same as now)
2. After sign-in, look up the user's company from `user_companies`
3. Show role selection with the company-specific role passwords (fetched server-side)
4. Store `companyId` in sessionStorage alongside `userRole`

### 2.2 Update `validate-role-password` Edge Function

Instead of reading from environment secrets (`SUPERVISOR_PASSWORD_HASH`, `PROPRIETOR_PASSWORD_HASH`), the function will:
1. Look up the user's company from `user_companies`
2. Read the company's `supervisor_password` and `proprietor_password` from the `companies` table
3. Validate against those per-company passwords

### 2.3 Company Registration Flow

Add a new page/flow for setting up a new company:
1. New user signs up (email/password)
2. After email verification, they are prompted to create their company
3. They enter: company name, contact phone, fuel prices, pump count, role passwords
4. Optionally upload a logo
5. A `companies` record and `user_companies` mapping are created

### 2.4 Add Company Admin Page

A settings page (accessible only by Proprietor) where they can:
- Edit company name, logo, contact phone
- Update fuel prices
- Change role passwords
- Manage default expenses and debtor names
- Add/remove users for their company

---

## Phase 3: Frontend Updates

### 3.1 Create a Company Context

A React context (`CompanyContext`) that provides:
- `companyId` -- the current company's ID
- `companyName` -- for display in headers
- `companyLogo` -- for the logo image
- `companySettings` -- fuel prices, pump count, defaults

This replaces all hardcoded values throughout the app.

### 3.2 Update ALL pages to use CompanyContext

Every page currently has this pattern:

```typescript
const STATION_ID = "00000000-0000-0000-0000-000000000001";
setUserId(STATION_ID);
```

This will be replaced with:

```typescript
const { companyId } = useCompany();
```

Pages affected (all 10):
- Index.tsx (Daily Tree)
- Stat.tsx
- Lotus.tsx
- Storage.tsx
- Trends.tsx
- FiservBills.tsx
- Attendance.tsx
- Salary.tsx
- Shortcut.tsx
- Login.tsx

### 3.3 Replace hardcoded branding

Every page header currently shows:
- `Sri MahaLingam Agency` logo
- Hardcoded contact phone `+91 82487 60240`

These will be replaced with dynamic values from the company context.

### 3.4 Replace hardcoded fuel prices

In `Index.tsx`, the default pump readings use hardcoded prices:
```typescript
petrol1: { price_per_litre: 101.88 }
diesel1: { price_per_litre: 93.48 }
```

These will come from `companySettings.petrol_price` and `companySettings.diesel_price`.

### 3.5 Replace hardcoded default expenses and debtors

Currently hardcoded as:
```typescript
["Density test", "food & tea", "Drinking water"]
["Pandian"]
```

These will come from `companySettings.default_expenses` and `companySettings.default_debtors`.

### 3.6 Update all database queries

All queries that use `.eq('user_id', userId)` where `userId` is the station ID will be changed to `.eq('company_id', companyId)`.

---

## Phase 4: Edge Functions and OCR

### 4.1 Update all 3 OCR edge functions

The OCR functions (`ocr-image`, `ocr-bill`, `ocr-storage`) don't need company-specific changes since they just process images and return data.

### 4.2 Update `validate-role-password`

As described in Phase 2.2 -- read passwords from the `companies` table instead of environment secrets.

---

## Phase 5: Company Logo Storage

### 5.1 Create a storage bucket

Create a `company-logos` storage bucket for company logo uploads.

### 5.2 Logo upload component

A simple image upload component in the company settings page.

---

## Implementation Order

The work will be done in this specific sequence to minimize breakage:

1. Database migration (add tables, columns, migrate data, update RLS) -- Phase 1
2. Company context and settings page -- Phase 3.1, 2.4
3. Update login and role validation -- Phase 2.1, 2.2, 2.3
4. Update all pages to use context -- Phase 3.2, 3.3, 3.4, 3.5, 3.6
5. Logo storage -- Phase 5
6. Testing and fixes

---

## What Will NOT Change

- The overall page structure and UI design stays the same
- The same 8 shortcut pages remain
- Calculator, OCR scanning, attendance, charts all work the same way
- The Supervisor/Proprietor role system stays identical
- Excel export functionality stays the same

---

## Risks and Considerations

- **Data migration**: Existing data will be preserved as Company #1. No data loss.
- **RLS complexity**: All policies must be carefully updated. Any mistake could expose one company's data to another.
- **Testing needed**: Each phase should be tested before moving to the next.
- **Multiple implementation steps**: This will require approximately 10-15 separate implementation messages due to the scope.
- **Company passwords in database**: Role passwords will be stored in the `companies` table (not hashed, matching the current pattern with environment secrets). This is the same security level as the current implementation.

