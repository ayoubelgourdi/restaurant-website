# Limón

Online ordering website for a poke bowl restaurant. Customers browse the menu and order for **dine-in** or **delivery**; staff manage orders, dishes, opening hours and statistics from a password-protected admin panel.

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.13-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-built--in-003B57?logo=sqlite&logoColor=white)

## Features

**Customer site**
- Responsive home page and ordering page (phone, tablet, desktop).
- Three languages: English, French and Arabic (full right-to-left support).
- Dine-in and delivery orders. Delivery uses the customer's live location.
- Dine-in proximity check: the customer must be near the restaurant to order.
- Ordering is blocked while the restaurant is closed, with a message showing when it opens.
- Server-side validation and total calculation, so prices cannot be tampered with from the browser.

**Admin panel (`/admin`)**
- **Orders:** board with *New* and *In progress* columns, a list of completed orders, a sound alert for new orders and printable receipts (80 mm).
- **Dishes:** add, edit and delete dishes in three languages, upload photos, mark items as sold out.
- **Statistics:** orders, revenue, average order, revenue per day, top dishes and split by order type, for any date range.
- **Opening hours:** hours per weekday plus a manual override (follow hours, open now, closed now). Customers see the result immediately.
- **Settings:** change the admin password and set the restaurant location for the dine-in check.

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22.13+ |
| Server | Express 4, EJS templates |
| Database | SQLite through the built-in `node:sqlite` module (no native dependencies) |
| Styling | Tailwind CSS v4 |
| Frontend | Vanilla JavaScript |

## Getting started

### Requirements
- Node.js **22.13 or newer** (check with `node -v`).

### Install and run

```bash
git clone <your-repository-url> limon
cd limon
npm install
ADMIN_PASSWORD="choose-a-strong-password" npm start
```

Open:
- Website: http://localhost:3000
- Order page: http://localhost:3000/order
- Admin panel: http://localhost:3000/admin

`npm start` builds the Tailwind CSS and starts the server. The database file is created automatically on the first run and filled with sample dishes.

> Node prints `ExperimentalWarning: SQLite is an experimental feature`. This is expected and harmless.

#### Setting environment variables on other shells

| Shell | Command |
|-------|---------|
| Bash / Git Bash | `ADMIN_PASSWORD="..." npm start` |
| PowerShell | `$env:ADMIN_PASSWORD="..."; npm start` |
| Command Prompt | `set ADMIN_PASSWORD=...&& npm start` |
| `.env` file | `npm run build:css && node --env-file=.env server.js` |

### Development

```bash
npm run dev:css   # rebuild Tailwind CSS on every change
node server.js    # run the server (restart after changing server code)
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port. |
| `ADMIN_PASSWORD` | `limon123` | Initial admin password. Used only until you change it in **Admin → Settings**. |
| `SHOP_TZ` | `Europe/Oslo` | Time zone used for opening hours and daily statistics. |
| `DB_FILE` | `data/limon.db` | Path of the SQLite database file. |
| `NODE_ENV` | – | Set to `production` to mark the session cookie as `Secure` (requires HTTPS). |

Always set `ADMIN_PASSWORD` or change the default password before exposing the site.

## Admin guide

### Change the password
**Admin → Settings → Change password.** The new password is stored hashed (scrypt with a random salt) in the database, and from then on `ADMIN_PASSWORD` is ignored. All other signed-in devices are signed out.

Forgot the password? Stop the server and run:

```bash
node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('data/limon.db').exec(\"DELETE FROM settings WHERE key='admin_pw'\")"
```

The admin password then falls back to `ADMIN_PASSWORD`.

### Set up the dine-in location check
1. Open **Admin → Settings** on a phone while standing inside the restaurant.
2. Press **Use my current location**, choose the allowed distance (default 150 m) and save.

Dine-in customers must then share their location and be within that distance. Until a location is saved, dine-in orders are accepted from anywhere. Delivery orders are not affected.

### Opening hours
**Admin → Opening hours.** Set hours per day, or use the manual switch to force the restaurant open or closed.

## Project structure

```
limon/
├── server.js          # Express app, routes and admin API
├── db.js              # SQLite schema, seeding, opening-hours logic
├── data/
│   └── seed.js        # Initial categories and dishes (EN / FR / AR)
├── src/
│   └── input.css      # Tailwind entry file and design tokens
├── public/
│   ├── i18n.js        # Translations and language switcher
│   └── img/           # Images (uploads go to img/uploads)
└── views/
    ├── index.ejs      # Home page
    ├── order.ejs      # Ordering page
    └── admin.ejs      # Admin panel
```

## Database

SQLite file at `data/limon.db` (WAL mode, so `-wal` and `-shm` files appear next to it; keep them together).

| Table | Purpose |
|-------|---------|
| `categories` | Menu categories with names in three languages |
| `dishes` | Dishes: price, photo, availability, names and descriptions in three languages |
| `orders` | Orders: type, status, customer details, location, total, timestamps |
| `order_items` | Items of each order, with the name and price at the time of ordering |
| `settings` | Opening hours, manual override, restaurant location, admin password hash |

To reset all data, stop the server and delete `data/limon.db*`. It is recreated with the sample dishes on the next start.

## API

### Public

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/status` | Open/closed state, next opening time, weekly hours, restaurant location |
| `POST` | `/api/order` | Place an order |

`POST /api/order` returns `{ num, total }` on success, or `{ error }` with one of: `mode`, `name`, `phone`, `loc`, `table`, `loc_dine`, `far`, `closed`, `empty`, `unavailable`, `rate`, `server`.

### Admin (requires a signed-in session)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/admin/login`, `/api/admin/logout` | Sign in and out |
| `POST` | `/api/admin/password` | Change the admin password |
| `GET` | `/api/admin/orders` | Active orders and the 30 latest completed orders |
| `POST` | `/api/admin/orders/:id/status` | Set status: `new`, `preparing`, `done` |
| `GET` `POST` | `/api/admin/dishes` | List and create dishes |
| `PUT` `DELETE` | `/api/admin/dishes/:id` | Update and delete a dish |
| `PATCH` | `/api/admin/dishes/:id/available` | Mark available or sold out |
| `POST` | `/api/admin/upload` | Upload a dish photo (PNG, JPEG, WebP, max 4 MB) |
| `PUT` | `/api/admin/hours` | Save opening hours and override |
| `PUT` | `/api/admin/geo` | Save or clear the restaurant location |
| `GET` | `/api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` | Statistics for a date range |

## Security

- Admin password hashed with scrypt; the session cookie is `HttpOnly` and `SameSite=Strict` (`Secure` in production).
- Login, password change and order submission are rate limited per IP.
- All SQL uses prepared statements; all user content is HTML-escaped when rendered.
- Prices and totals are calculated on the server from the database.
- Uploaded images are restricted to PNG, JPEG and WebP and saved under random names.

Things to be aware of when deploying:
- **Use HTTPS.** Browsers only allow geolocation on HTTPS (or `localhost`), and the session cookie should be `Secure`.
- **Behind a reverse proxy** (nginx, Caddy, a hosting platform), add `app.set('trust proxy', 1);` in `server.js` so rate limiting uses the real client IP.
- Admin sessions are kept in memory, so restarting the server signs everyone out.
- Browser location can be spoofed by a determined user. The dine-in check is a deterrent, not a guarantee. A QR code per table is a stronger option.

## Customisation

- **Menu:** use **Admin → Dishes**. Initial sample data lives in `data/seed.js` and is only used when the database is empty.
- **Texts and translations:** edit `public/i18n.js` (each key is `[English, French, Arabic]`).
- **Colours and typography:** design tokens are in `src/input.css`.
- **Currency:** the `DH` label is written directly in `views/order.ejs`, `views/admin.ejs` and `public/i18n.js`.

## Known limitations

- No online payment: customers pay at the restaurant (dine-in) or on delivery.
- One shop only. The home page shows a second location with static details.
- Prices are whole numbers (no decimals).
- No holiday or one-off closing dates; use the manual override instead.

## Assets

The photos in `public/img/` are placeholders. Replace them with images you own or have the rights to use before publishing the repository.

## License

No license has been chosen yet. Add a `LICENSE` file before making the repository public (see [choosealicense.com](https://choosealicense.com)).