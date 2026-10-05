# Eskom Connect API

Node.js + Express backend for the Eskom Connect Customer Application
and Admin Portal, backed by Neon PostgreSQL.

## Local run

    npm install
    npm start

## Endpoints

- POST   /api/v1/auth/register
- POST   /api/v1/auth/login
- POST   /api/v1/auth/staff/login
- GET    /api/v1/customers/me
- PUT    /api/v1/customers/me
- GET    /api/v1/reports
- GET    /api/v1/reports/my
- POST   /api/v1/reports
- PATCH  /api/v1/reports/:id/status
- GET    /api/v1/complaints
- GET    /api/v1/complaints/my
- POST   /api/v1/complaints
- PATCH  /api/v1/complaints/:id/status
- GET    /api/v1/appointments
- GET    /api/v1/appointments/my
- POST   /api/v1/appointments
- PATCH  /api/v1/appointments/:id
- GET    /api/v1/notifications
- GET    /api/v1/notifications/my
- POST   /api/v1/notifications
- PATCH  /api/v1/notifications/:id/read
- GET    /api/v1/communities
- GET    /api/v1/admin/staff
- GET    /api/v1/admin/audit

## Deploy

Push to GitHub, then on Render create a Web Service from this repo.
Set `DATABASE_URL` to your Neon pooled connection string.
