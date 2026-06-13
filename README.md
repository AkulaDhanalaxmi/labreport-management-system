# Lab Management System

Full-stack Lab Management System (Node.js + Express + MongoDB)

## Setup (Local)
1. Copy `.env.sample` to `.env` and edit values if needed.
2. Install dependencies: `npm install`
3. Start MongoDB locally or use Atlas, ensure `MONGO_URI` in `.env` points to it.
4. Run seed script to create sample users and tests: `node seed.js`
5. Start app: `npm run dev` or `npm start`
6. Open http://localhost:3000

## Sample accounts created by seed script
- Admin: admin@lab.com / password123
- Technician: tech@lab.com / password123
- Patient: patient@lab.com / password123

## Docker (recommended for quick start)
1. Ensure Docker & Docker Compose are installed.
2. Build and start containers: `docker compose up --build`
3. App will be available at http://localhost:3000
4. To run seed inside the container (optional):
   - `docker compose exec app node seed.js`

## Notes
- Uploaded reports are stored in `public/uploads` and mounted as a volume in Docker setup.
- The seed script clears collections before inserting sample data — don't run in production.


## Enhanced UI & Features

- Professional theme (light/dark)
- Improved dashboard cards and stats
- Admin analytics page with Chart.js
- Theme toggle and polished CSS
