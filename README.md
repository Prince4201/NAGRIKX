# NAGRIKX

AI-assisted civic grievance reporting and resolution management platform connecting citizens, department officers, and city administrators.

## Features

- **Citizen Issue Reporting:** Multi-step wizard with location picker, browser geolocation, and photograph upload.
- **Department Routing:** Categorization and routing to municipal departments (Roads, Sanitation, Lighting, Water & Sewage).
- **Officer Complaint Queue:** Dedicated workflows for review, in-progress updates, internal notes, and resolution evidence.
- **Citizen Tracking & Transparency:** Live status timeline, updates, and reopen mechanisms.
- **Administrator Oversight:** Manage municipal departments, review and approve officer applications, and monitor civic resolution metrics.
- **Three Distinct Roles:** Strict server-side and PostgreSQL RLS separation for `citizen`, `department_officer`, and `admin`.

## Technology Stack

- **Framework:** TanStack Start (SSR on Vite + Nitro) with React 19
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth & Storage
- **State & Server Functions:** TanStack React Query v5 & TanStack Server Functions
- **Styling:** Tailwind CSS v4, custom warm ivory & forest green design system

## Development

```sh
npm install
npm run dev
```

Runs the development server locally on `http://localhost:8080`.
