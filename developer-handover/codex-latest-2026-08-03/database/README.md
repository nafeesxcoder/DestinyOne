# DestinyOne MySQL database

The canonical MySQL schema currently lives at `../backend/schema.sql` so the API and database definition stay versioned together.

1. Create a MySQL 8 database: `mysql -u root -p < backend/schema.sql`
2. Copy `backend/.env.example` to `backend/.env` and enter the MySQL connection values.
3. Start the backend. Without MySQL credentials it intentionally uses preview data.

For an existing database created before the realtime chat upgrade, apply `database/migrations/002_realtime_chat.sql` once. Fresh databases already receive message types, delivery/read timestamps, private nicknames and call audit tables from `backend/schema.sql`.

Before production, use a dedicated least-privilege MySQL account, rotate `JWT_SECRET`, enable TLS, and run migrations through the deployment platform rather than using a root account.
