# Talvio Project Backend Setup

Welcome to the Talvio backend! This guide will help you set up the project locally using the shared Neon database.

## Prerequisites
- Node.js (v18+ recommended)
- npm (comes with Node.js)
- Neon database credentials (shared with you)

## 1. Clone the Repository
```
git clone <repo-url>
cd talvio/backend
```

## 2. Install Dependencies
```
npm install
```

## 3. Configure Environment Variables
Create a `.env` file in the `backend` folder. Use the following template:

```
DATABASE_URL="postgresql://<username>:<password>@<host>/<database>?sslmode=require"
JWT_SECRET="your_jwt_secret"
PORT=3000
```
- Replace `<username>`, `<password>`, `<host>`, and `<database>` with your Neon DB credentials.
- Set `JWT_SECRET` to any random string.

## 4. Run Database Migrations
If using Prisma:
```
npx prisma migrate deploy
```

## 5. Start the Development Server
```
npm run dev
```

## 6. API Endpoints
- The server will run on `http://localhost:8000` by default.
- API routes are defined in `src/routes.ts`.

## 7. Troubleshooting
- If you encounter errors, check your `.env` file and database connection.
- Ensure your Neon DB is accessible and credentials are correct.

## 8. Useful Commands
- `npm run dev` — Start server in development mode
- `npx prisma studio` — Open Prisma Studio for DB management

## 9. Additional Notes
- The uploads folder is used for file uploads.
- Shared Neon DB means changes will affect both users.

---
For frontend setup, see the `frontend/README.md`.

Feel free to reach out for help!
