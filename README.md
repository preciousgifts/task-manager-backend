# PM Task Tracker

A simple full-stack project task tracker for Project Managers, Admins, and Team Members.

## Features

- JWT register/login with protected routes
- Roles: Admin, Project Manager, Team Member
- Project CRUD with BRAG status, owner, timeline, and progress
- Task CRUD with assignment, priority, BRAG status, comments, and overdue highlighting
- Dashboard summary for project and task status health
- Responsive React + Tailwind interface with sidebar navigation

## BRAG Status

- Blue: Completed
- Red: Delayed
- Amber: Threatened
- Green: On Track

New projects and tasks default to Green.

## Folder Structure

```txt
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    utils/
    app.js
    server.js
frontend/
  src/
    components/
    context/
    hooks/
    pages/
    services/
    utils/
    App.jsx
    main.jsx
```

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- MongoDB only if you want to migrate old Mongo data into PostgreSQL

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Update `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pm_task_tracker?schema=public
MONGODB_URI=mongodb://127.0.0.1:27017/pm_task_tracker
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URLS=http://localhost:5173,http://localhost:5174
```

The API will run at `http://localhost:5000/api`.

To migrate existing MongoDB data after the PostgreSQL schema is ready:

```bash
cd backend
npm run migrate:mongo
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Update `frontend/.env` if your API is not on port 5000:

```env
VITE_API_URL=http://localhost:5000/api
```

The app will run at `http://localhost:5173`.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/export`
- `POST /api/projects/:id/import`
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/:id/comments`
- `GET /api/dashboard/summary`
- `GET /api/updates`

## First Run

1. Start PostgreSQL and create the database from `DATABASE_URL`.
2. Run `npx prisma migrate deploy`.
3. Optionally run `npm run migrate:mongo` if you have old MongoDB data.
4. Start the backend.
5. Start the frontend.
6. Register an Admin or Project Manager account.
7. Create projects, create tasks, assign users, and track BRAG health from the dashboard.
