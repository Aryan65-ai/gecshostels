# GEC Hostel – Backend + Frontend

Express server serves the API and the static site (HTML, CSS, JS). Node.js 18+ required.

## Setup

1. **Node.js 18+** (and optionally **MySQL 8+** for full API).
2. **Environment:** Copy `.env.example` to `.env` and set values:
   ```bash
   copy .env.example .env
   ```
   Edit `.env`: set `DB_*` and `JWT_SECRET` if you use the database.
3. **Database (Required for all features):**
   - Import the complete schema: `mysql -u root < setup_database.sql`
   - This creates the database, tables, and seed data (admin user, rooms, etc).

## Run locally

```bash
npm install
npm run dev
```

- **Site:** http://localhost:4000/home.html (or http://localhost:4000/ → redirects to home)
- **Health:** http://localhost:4000/health

Without MySQL, the site pages and static assets work; API routes that use the DB will return 500 until the DB is set up.

## Scripts

| Command       | Description                    |
|---------------|--------------------------------|
| `npm run dev` | Start with watch + `.env`      |
| `npm start`   | Start once (e.g. production)  |

## API

| Method | Path              | Description        |
|--------|-------------------|--------------------|
| GET    | /health           | Health check       |
| POST   | /api/auth/signup  | Register           |
| POST   | /api/auth/login   | Login              |
| GET    | /api/rooms        | List rooms         |
| GET    | /api/rooms/:id    | Room by id         |
| GET    | /api/bookings     | List bookings      |
| POST   | /api/bookings     | Create booking     |
| POST   | /api/payments/mark-paid | Mark booking paid |
| GET    | /api/me           | Current user       |
| GET    | /api/me/bookings  | My bookings        |
| GET    | /api/admin/students/:id | Admin: student profile |

## Deploy

- **Full stack (Node + MySQL):** Use a host that supports Node and a MySQL database (e.g. **Railway**, **Render**, **Fly.io**). Set env vars from `.env.example`, run the SQL migrations on the hosted DB, then run `npm start` (or use the host’s Node start command). Point the app at `PORT` provided by the host.
- **Frontend only (static):** To deploy only the HTML/CSS/JS (no API), upload the folder to **Netlify**, **Vercel**, or **GitHub Pages** and set the root to this project. Use “Static site” or “Static HTML”. The site will load; API features (login, bookings, payments) need the backend deployed separately and the frontend configured to call that API URL.

Notes: Uses `mysql2`, `bcryptjs`, and JWT. Ensure `.env` matches your MySQL credentials when using the database.
