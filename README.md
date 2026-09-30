# Limón

Express + EJS + Tailwind v4 + SQLite (built into Node, bla package zayd). Node >= 22.13.

    npm install
    ADMIN_PASSWORD=your-password npm start        # http://localhost:3000
    PORT=3001 ADMIN_PASSWORD=... npm start         # ila 3000 ma3mour

Pages: `/` home · `/order` order · `/admin` (password)

- Admin password: ADMIN_PASSWORD kay-khdem ghir f l'bdaya. Mn /admin > Settings tqder tbddlo; ba3d hadchi kay-t7fed
  hashed f database (settings.admin_pw) w l'env kay-t-ignora.
  Nsiti l'password? 9ef l'server w dir:
  node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('data/limon.db').exec(\"DELETE FROM settings WHERE key='admin_pw'\")"
  (w ba3d kay-rj3 l ADMIN_PASSWORD).
- Dine-in check: /admin > Settings > Restaurant location. Ila mdeddti l'moqa3, l'client Dine-in khass ykoun f l'radius.
- Languages: English / Français / العربية (public/i18n.js). Currency: DH.
- Database: data/limon.db (kat-t-creea wa7dha). Shop timezone: Europe/Oslo (SHOP_TZ).
- Geolocation needs HTTPS (or localhost).
