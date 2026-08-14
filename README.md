# CampusResolve - Smart Digital Complaint & Feedback Management System

CampusResolve is a production-ready, cloud-native web platform for students, faculty, and administrators to collaborate on resolving campus issues.

---

## 1. High-Level Architecture Diagram (Text)

```
[Client SPA]
  ├── React + Tailwind + Framer Motion UI
  ├── Google OAuth Client SDK
  └── Axios API client with JWT interceptor
        ↓ HTTPS
[API Gateway / Express Server]
  ├── Auth Service (email + Google OAuth)
  ├── Complaint Service
  ├── Teacher Service
  ├── Analytics Service
  ├── File Upload Service (S3-compatible)
  └── Notification Service (Nodemailer + Queue)
        ↓
[MongoDB Atlas] <──> [Redis/Bull Queue] <──> [SMTP Provider]
```

- **Infra:** NGINX/CloudFront for TLS + caching, Dockerized Node services scaled behind PM2/containers. Logs shipped to Application Insights/Datadog.
- **Security:** HTTPS everywhere, JWT (RS256), refresh token rotation, rate limiting, CORS whitelist, Helmet, Mongo sanitize.

---

## 2. Frontend Overview

- **Tech:** React 18 + TypeScript + Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Zustand store, Recharts, Google Identity Services, Axios.
- **Key pages:** Landing, Login (email + Google), Student Dashboard, Admin Dashboard, Teacher Management.
- **UX:** Modern glassmorphism palette, parallax hero, animated forms, skeleton loaders, dark-mode toggle.

### Component Tree (abridged)
```
App
 ├─ LandingPage
 │   ├─ Hero
 │   ├─ Features
 │   └─ Testimonials
 ├─ LoginPage
 │   ├─ LoginTabs
 │   ├─ LoginForm
 │   └─ GoogleButton
 ├─ StudentLayout
 │   ├─ Sidebar
 │   └─ StudentDashboard
 │       ├─ ComplaintForm
 │       ├─ StatusTracker
 │       └─ Timeline
 └─ AdminLayout
     ├─ KPIGrid
     ├─ ComplaintTable
     ├─ ResolutionChart
     └─ TeacherPanel
```

---

## 3. Backend Overview

- **Tech:** Node.js 20, TypeScript, Express, Mongoose, JWT, Google Auth Library, Bcrypt, Nodemailer, BullMQ (Redis), Multer/S3 SDK, Celebrate/Joi, Winston, Helmet, Rate limiter.
- **Modules:** `auth`, `complaints`, `teachers`, `analytics`, `notifications`, `uploads`.
- **Jobs:** SLA escalation worker, email dispatcher.

### Service Architecture
```
server.ts -> registers middleware -> mounts feature routers
modules/
  auth/ (controller, service, validators)
  complaints/
  teachers/
  analytics/
  notifications/
  uploads/
```

---

## 4. Database Design (MongoDB)

| Collection | Fields |
|------------|--------|
| `users` | name, email, role, googleId, passwordHash, avatarUrl, lastLoginAt, createdAt |
| `teachers` | name, department, email, designation, active, createdAt |
| `complaints` | studentId, category, department, teacherId, description, attachments, status, priority, adminRemarks, timeline[], slaDueAt, timestamps |
| `emailLogs` | recipient, subject, template, status, error, sentAt |
| `tokens` | userId, refreshTokenHash, expiresAt, revoked |

Indexes: unique email on users/teachers, compound `complaints` on `{ department, status }`, TTL on tokens, partial index for `timeline.timestamp`.

---

## 5. API Flow Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Admin invite / manual user creation |
| POST | `/api/auth/login` | Email/password login |
| GET | `/api/auth/google` | OAuth redirect |
| GET | `/api/auth/google/callback` | Google callback -> JWT |
| POST | `/api/auth/token` | Refresh JWT |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET/POST | `/api/complaints` | List/create complaints |
| GET/PATCH | `/api/complaints/:id` | Detail/update status |
| POST | `/api/complaints/:id/assign` | Assign teacher |
| POST | `/api/complaints/:id/escalate` | Force escalation |
| CRUD | `/api/teachers` | Manage teacher directory |
| GET | `/api/analytics/*` | KPI and chart data |
| POST | `/api/uploads` | Signed upload URLs |
| GET | `/api/email/logs` | Email audit (admin) |

---

## 6. Google Authentication Flow

1. Frontend loads Google Identity Services SDK using OAuth Client ID.
2. User clicks "Sign in with Google"; GIS returns credential ID token.
3. Frontend posts token to `/api/auth/google/verify`.
4. Backend verifies token signature + domain, upserts user, generates access/refresh JWT pair.
5. Access JWT returned in response, refresh token stored in httpOnly secure cookie.
6. Subsequent API calls include `Authorization: Bearer <JWT>`; refresh endpoint rotates tokens.

---

## 7. Email Notification Flow

- Controllers emit events to Notification Service.
- Jobs persisted in Redis queue; worker renders MJML templates -> HTML -> sends via Nodemailer (SMTP/Gmail API).
- On success/failure, log stored in `emailLogs` for audit; retries with exponential backoff; escalation emails triggered by SLA worker.

Triggers:
1. Complaint submission confirmation to student.
2. Assignment email to teacher + student.
3. Status update and resolution summary.
4. Escalation reminder to admin after SLA breach.

---

## Critical Setup Steps (Required for Login)

Before running the app, you MUST configure these two external services:

### 1. 🟢 Fix Database Connection (MongoDB Atlas)
If you see `MongoDB connection error` or `Network Error`:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Go to **Network Access** (left sidebar).
3. Click **+ Add IP Address**.
4. Select **Allow Access from Anywhere** (0.0.0.0/0) for development.
5. Click **Confirm**.

### 2. 🔵 Fix Google Sign-In (Google Cloud)
If you see `The given origin is not allowed`:
1. Log in to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Edit your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
4. Click **Save**.

---

## Setup Instructions Strategy

- Framer Motion page transitions (opacity/translate with spring ease), hero parallax, KPI cards count-up, stepper progress animations, table row micro-interactions, skeleton shimmer for loading states, respects `prefers-reduced-motion`.

---

## 9. Deployment Overview

- **Frontend:** Build with Vite, deploy to Vercel/Netlify/S3+CloudFront, environment vars for API base + Google client ID.
- **Backend:** Dockerized Express service, deploy to Azure App Service/Render/Heroku; PM2 cluster for horizontal scaling.
- **DB & Queue:** MongoDB Atlas (M10+) and Redis (Azure Cache/Upstash) with VNet/IP whitelisting.
- **CI/CD:** GitHub Actions -> lint/test/build -> deploy; infrastructure secrets stored securely.
- **Monitoring:** Application Insights/Datadog dashboards, uptime monitors, alert on queue lag/error spikes.

---

## 10. Getting Started

```bash
# install all workspaces
yarn install # or npm install / pnpm install

# run frontend
yarn dev:frontend

# run backend
yarn dev:backend
```

### Default local logins

- Student login: `student@campusresolve.edu` / `password123`
- Admin login: `admin@campusresolve.edu` / `pass123@A` (or `admin123`)

#### 🚨 IMPORTANT: Teacher Logins (Updated)

The generic `TCH1001` ID does not exist in the database. You **must** log in with one of the department-specific IDs below.

| Department | Teacher ID    | Password     | Name               |
|------------|---------------|--------------|--------------------|
| **CSE**    | `TCH-CSE-001` | `teachcse`   | Dr. Rajesh Kumar   |
| **ECE**    | `TCH-ECE-001` | `teach123`   | Dr. Priya Sharma   |
| **MECH**   | `TCH-MECH-001`| `teach123`   | Dr. Arun Patel     |
| **EEE**    | `TCH-EEE-001` | `teach123`   | Dr. Meena Iyer     |
| **AIDS**   | `TCH-AIDS-001`| `teach123`   | Dr. Karthik Reddy  |
| **IT**     | `TCH-IT-001`  | `teach123`   | Dr. Lakshmi Nair   |

Provide `.env` files for both frontend and backend using the `.env.example` templates before running services.

### Frontend env (required for Google login)

Create [frontend/.env](frontend/.env) with:

```dotenv
VITE_API_BASE_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```
