# R&G Trading – Air Conditioner E-Commerce Backend

Node.js + Express + MySQL backend for the R&G Trading e-commerce platform,
covering Auth (JWT) and the Admin Dashboard analytics API.

---

## 📁 Project Structure

```
rg-trading-backend/
├── migrations/
│   ├── 001_schema.sql      # Full DB schema (run first)
│   ├── run.js              # Migration runner
│   └── seed.js             # Sample data seeder
├── src/
│   ├── config/
│   │   └── database.js     # MySQL pool
│   ├── controllers/
│   │   ├── auth.controller.js   # Register, login, refresh, logout, profile
│   │   └── admin.controller.js  # Dashboard analytics + order/user management
│   ├── middleware/
│   │   ├── auth.js          # JWT authenticate + role authorize
│   │   └── validate.js      # express-validator error collector
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── admin.routes.js
│   ├── utils/
│   │   ├── jwt.js           # Token generation & verification helpers
│   │   └── response.js      # Standardized API response helpers
│   └── server.js            # Express app entry point
├── .env.example
└── package.json
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and secrets
```

### 3. Create MySQL database
```sql
CREATE DATABASE rg_trading;
```

### 4. Run migrations
```bash
npm run migrate
```

### 5. Seed sample data (optional)
```bash
npm run seed
# Creates: admin@rgtrading.com / Admin@123456
#          juan@example.com    / Customer@123
```

### 6. Start server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

---

## 🔑 Auth API

| Method | Endpoint                    | Auth     | Description              |
|--------|-----------------------------|----------|--------------------------|
| POST   | `/api/auth/register`        | Public   | Create customer account  |
| POST   | `/api/auth/login`           | Public   | Login, get tokens        |
| POST   | `/api/auth/refresh`         | Public   | Rotate refresh token     |
| POST   | `/api/auth/logout`          | Public   | Invalidate refresh token |
| GET    | `/api/auth/me`              | 🔒 Token | Get own profile          |
| PUT    | `/api/auth/me`              | 🔒 Token | Update own profile       |
| PUT    | `/api/auth/change-password` | 🔒 Token | Change password          |

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "maria@example.com",
  "password": "SecurePass123",
  "first_name": "Maria",
  "last_name": "Santos",
  "phone": "09181234567"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@rgtrading.com",
  "password": "Admin@123456"
}
```
Response includes `access_token` (7d) and `refresh_token` (30d).

---

## 🛠 Admin Dashboard API

All admin routes require:
```
Authorization: Bearer <access_token>
```
And the user must have `role = 'admin'` or `'superadmin'`.

| Method | Endpoint                                | Description                        |
|--------|-----------------------------------------|------------------------------------|
| GET    | `/api/admin/dashboard/summary`          | KPI cards (revenue, orders, users) |
| GET    | `/api/admin/dashboard/revenue-trends`   | Chart data by day/week/month       |
| GET    | `/api/admin/dashboard/top-products`     | Most purchased aircon models       |
| GET    | `/api/admin/dashboard/seasonal-demand`  | Monthly demand averages            |
| GET    | `/api/admin/dashboard/peak-periods`     | Sales by hour & day of week        |
| GET    | `/api/admin/dashboard/customer-preferences` | Sales by category/brand/HP   |
| GET    | `/api/admin/dashboard/repeat-customers` | Repeat buyer list + LTV            |
| GET    | `/api/admin/orders`                     | Paginated order list with filters  |
| PATCH  | `/api/admin/orders/:id/status`          | Update order/payment status        |
| GET    | `/api/admin/users`                      | Paginated user list with filters   |
| PATCH  | `/api/admin/users/:id/toggle-status`    | Activate/deactivate user           |

### Query Parameters

**`/dashboard/summary`**
- `period` — lookback days (default: `30`)

**`/dashboard/revenue-trends`**
- `granularity` — `day` | `week` | `month` (default: `day`)
- `months` — how many months back (default: `6`)

**`/dashboard/top-products`**
- `limit` — max results (default: `10`)
- `months` — lookback months (default: `3`)

**`/admin/orders`**
- `status` — filter by order status
- `payment_status` — filter by payment status
- `search` — search by order number or email
- `page`, `limit` — pagination

**`/admin/users`**
- `role` — `customer` | `admin`
- `search` — search by name/email
- `page`, `limit` — pagination

---

## 🔒 Security Features

- **Password hashing** — bcrypt with 12 salt rounds
- **JWT rotation** — refresh tokens are rotated on each use
- **Rate limiting** — global 100 req/15 min; auth endpoints 10 req/15 min
- **Helmet.js** — security headers
- **CORS** — allowlist-based origin control
- **Role-based access** — customer / admin / superadmin
- **Input validation** — express-validator on all routes

---

---

## 📦 Products API

| Method | Endpoint                       | Auth          | Description                     |
|--------|--------------------------------|---------------|---------------------------------|
| GET    | `/api/products`                | Public        | List/search products            |
| GET    | `/api/products/categories`     | Public        | List all categories             |
| GET    | `/api/products/:id`            | Public        | Get single product              |
| GET    | `/api/products/admin/low-stock`| 🔒 Admin      | Products below stock threshold  |
| POST   | `/api/products`                | 🔒 Admin      | Create product                  |
| PUT    | `/api/products/:id`            | 🔒 Admin      | Update product                  |
| DELETE | `/api/products/:id`            | 🔒 Admin      | Soft-delete product             |
| PATCH  | `/api/products/:id/stock`      | 🔒 Admin      | Adjust stock (+/-)              |

### Product Query Params
- `category` — category slug (e.g. `split-type`)
- `brand` — brand name
- `min_price` / `max_price` — price range
- `search` — full-text search on name/model/brand
- `sort` — `price` | `name` | `created_at` | `stock_qty`
- `order` — `ASC` | `DESC`
- `page`, `limit` — pagination

---

## 🛒 Orders API

| Method | Endpoint                        | Auth     | Description                    |
|--------|---------------------------------|----------|--------------------------------|
| POST   | `/api/orders`                   | 🔒 Token | Place a new order              |
| GET    | `/api/orders`                   | 🔒 Token | My order history               |
| GET    | `/api/orders/:id`               | 🔒 Token | Order details with line items  |
| POST   | `/api/orders/:id/cancel`        | 🔒 Token | Cancel pending/confirmed order |
| POST   | `/api/orders/:id/pay`           | 🔒 Token | Record payment for an order    |
| GET    | `/api/orders/addresses`         | 🔒 Token | My saved addresses             |
| POST   | `/api/orders/addresses`         | 🔒 Token | Add delivery address           |
| DELETE | `/api/orders/addresses/:id`     | 🔒 Token | Remove address                 |

### Place Order Example
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    { "product_id": "uuid-here", "quantity": 1 },
    { "product_id": "uuid-here", "quantity": 2 }
  ],
  "address_id": "uuid-here",
  "payment_method": "gcash",
  "notes": "Please call before delivery"
}
```

### Business Rules
- Stock is **locked & decremented** atomically when order is placed
- Stock is **restored** automatically if order is cancelled
- Free shipping on orders **≥ ₱10,000**, otherwise ₱500 flat
- Only `pending` or `confirmed` orders can be cancelled
- Cancellation and payment recording use **DB transactions**

---

## 📊 Database Tables

| Table               | Description                              |
|---------------------|------------------------------------------|
| `users`             | Customers and admin accounts             |
| `refresh_tokens`    | Active refresh tokens (rotating)         |
| `categories`        | Aircon product categories                |
| `products`          | Aircon models with specs & pricing       |
| `addresses`         | Customer delivery addresses              |
| `orders`            | Customer orders with payment tracking    |
| `order_items`       | Line items per order                     |
| `customer_activity` | Behavior events (views, cart, checkout)  |
