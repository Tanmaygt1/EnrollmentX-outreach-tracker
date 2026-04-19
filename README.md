# Pulse CRM

A fast, dark, Kanban-style outreach CRM backed by Google Sheets — no database required.

## How it works

### Vacant Leads pool
Every lead where **"DMed?"** is empty/No **and** **"DMed by?"** is empty shows up as a vacant lead. Anyone on the team can see and claim it.

### Claiming a lead
When a team member clicks **"Claim & DM"** on a vacant card, the app instantly:
1. Writes their name into the **"DMed by?"** column
2. Writes `Yes` into the **"DMed?"** column
3. Sets the **Stage** to `DMed`
4. Appends a row to the Outreach Log sheet
5. Removes the card from the Vacant pool for everyone else
6. Adds it to the claimer's personal **My Pipeline** kanban

### My Pipeline
Each team member's private Kanban shows only leads they've claimed. Drag cards across stages (DMed → Replied → Interested → Booked / Rejected). Each drag auto-logs to the Outreach Log sheet.

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/pulse-crm.git
cd pulse-crm
npm install
```

### 2. Column mapping

The app reads your sheet by **header name** — it doesn't care about column order. It searches for these column names (case-insensitive):

| Field | Recognised header names |
|-------|------------------------|
| Full name | `Full name`, `Name`, `Contact name` |
| Email | `Public email`, `Email` |
| Phone country code | `Phone country code`, `CC` |
| Phone number | `Phone number`, `Phone`, `Mobile` |
| Profile link | `Profile link`, `Instagram`, `IG link` |
| DMed? | `DMed?`, `DMed`, `DM sent?` |
| Date of DM | `Date of DM`, `DM date` |
| DMed by? | `DMed by?`, `DMed by`, `Outreached by` |
| Replied? | `Replied?`, `Replied` |
| Interested? | `Interested?`, `Interested` |
| Follow-up 1–3 | `Follow-up 1`, `Follow-up 2`, `Follow-up 3` |
| Stage | `Stage` ← auto-created if missing |
| Notes | `Notes` ← auto-created if missing |
| Assigned To | `Assigned To` ← auto-created if missing |

> **Your existing sheet should work as-is.** The app will append Stage, Notes, and Assigned To columns automatically on first run if they don't exist.

### 3. Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project → Enable **Google Sheets API**
3. **IAM & Admin → Service Accounts → Create Service Account**
4. Give it a name → Create → skip optional steps
5. Click the service account → **Keys → Add Key → Create new key → JSON**
6. Download the JSON — you need `client_email` and `private_key`

### 4. Share both sheets with the service account

Open each Google Sheet → **Share** → paste the service account email → set to **Editor**.

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
# Sheet IDs — the long string in the URL:
# https://docs.google.com/spreadsheets/d/THIS_PART/edit
LEADS_SHEET_ID=your_leads_sheet_id_here
OUTREACH_SHEET_ID=your_outreach_log_sheet_id_here

# Optional: if your data is on a tab named something other than "Sheet1"
LEADS_SHEET_NAME=Sheet1
OUTREACH_SHEET_NAME=Sheet1

# From the downloaded JSON key file
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_KEY\n-----END RSA PRIVATE KEY-----\n"
```

> **Private key tip:** Copy the `private_key` value from the JSON exactly, including all `\n` characters. Wrap it in double quotes.

### 6. Set team members

Edit one line in `src/types/index.ts`:

```ts
export const TEAM_MEMBERS = ['Aman', 'Priya', 'Raj', 'Sneha', 'Kavya'];
```

### 7. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

**Option A — Vercel CLI:**
```bash
npx vercel
```

**Option B — GitHub import (recommended):**
1. Push to GitHub
2. [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add the same env vars in Vercel's dashboard under **Environment Variables**

> For `GOOGLE_PRIVATE_KEY` in Vercel: paste the raw value. Vercel handles escaping — don't add extra outer quotes.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── leads/route.ts                  GET all leads
│   │   ├── leads/[rowIndex]/route.ts       PATCH a lead (update fields or claim)
│   │   └── outreach/route.ts               GET stats  |  POST log entry
│   ├── pipeline/page.tsx
│   ├── dashboard/page.tsx
│   ├── team/page.tsx
│   ├── layout.tsx                          Wraps all pages with Nav + providers
│   ├── providers.tsx                       TanStack Query provider
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── Nav.tsx                         Top nav + "I am" member picker + ActiveMemberProvider
│   │   └── LogOutreachModal.tsx
│   ├── pipeline/
│   │   ├── PipelineBoard.tsx               Vacant pool + My Pipeline kanban
│   │   ├── KanbanColumn.tsx
│   │   ├── LeadCard.tsx                    Claim & DM button on vacant cards
│   │   └── LeadDetailPanel.tsx             Full lead editor (slide-in panel)
│   ├── dashboard/
│   │   └── DashboardView.tsx
│   └── team/
│       └── TeamView.tsx
├── lib/
│   ├── sheets.ts                           Google Sheets read/write (column-name based)
│   └── stats.ts                            Outreach stat computation
└── types/index.ts                          Types, constants, isVacant(), isOwnedBy()
```

---

## Customisation

| What to change | Where |
|----------------|-------|
| Team member names | `src/types/index.ts` → `TEAM_MEMBERS` |
| Sheet tab name | `.env.local` → `LEADS_SHEET_NAME` / `OUTREACH_SHEET_NAME` |
| Pipeline stages | `src/types/index.ts` → `STAGES` + `STAGE_COLORS` |
| Vacancy rule | `src/types/index.ts` → `isVacant()` function |
| Poll interval | `PipelineBoard.tsx` → `refetchInterval` (default 20 s) |

---

## Tech Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · @dnd-kit (drag and drop) · @tanstack/react-query (optimistic updates) · googleapis (Sheets API) · date-fns · Vercel
