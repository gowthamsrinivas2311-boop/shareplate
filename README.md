# SharePlate 🍽️ — Surplus Food Redistribution Platform

> Events and community kitchens list safe surplus food; nearby groups (NGOs, shelters, individuals) reserve and collect within a pickup window.

---

## Features

- **Atomic Reservation System**: Prevents race conditions and guarantees zero overbooking via database-enforced atomic operations.
- **Real-Time Availability Tracking**: Dynamic inventory counts and instant status transitions (`active`, `sold_out`, `expired`, `cancelled`).
- **Automatic Expiry Management**: Dual-layer protection using lazy on-read checks combined with a recurring cron sweep.
- **Pickup Code Verification**: Secure, human-readable claim codes generated upon reservation for collection validation.
- **Responsive, Mobile-First UI**: Intuitive donor and recipient flows with distinctive ticket-style listing cards and toast alerts.
- **Production-Ready**: Comprehensive configuration for cloud hosting, containerization, Atlas database integration, and SPA routing.

---

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Axios, plain CSS (modern CSS custom properties)
- **Backend**: Node.js 18+, Express 4, Mongoose 8, Zod schema validation
- **Database**: MongoDB (Atlas or local instance)

---

## Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally, or a MongoDB Atlas connection URI

### 2. Clone and Install

```bash
git clone <repo-url>
cd shareplate

# Install server dependencies
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI

# Install client dependencies  
cd ../client
npm install
cp .env.example .env
```

### 3. Seed the Database

Populate initial listings, sample donor accounts, and test data:

```bash
cd server
npm run seed
```

### 4. Start Development Servers

Run backend and frontend concurrently in separate terminals:

```bash
# Terminal 1 - Server (runs on http://localhost:5000)
cd server
npm run dev

# Terminal 2 - Client (runs on http://localhost:5173)
cd client
npm run dev
```

### 5. Access the Application

Open your browser and navigate to:
[http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/shareplate` |
| `PORT` | Express server port | `5000` |
| `CLIENT_ORIGIN` | CORS allowed origins (comma-separated for multiples) | `http://localhost:5173` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |

### Client (`client/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL prefix | `/api` |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/listings` | Create a new food surplus listing |
| `GET` | `/api/listings` | Browse listings (filters: `status`, `category`, `search`, `donorContact`, `page`, `limit`) |
| `GET` | `/api/listings/:id` | Get details for a specific listing |
| `PATCH` | `/api/listings/:id` | Edit listing details |
| `PATCH` | `/api/listings/:id/cancel` | Cancel an active listing |
| `POST` | `/api/listings/:id/reservations` | Reserve food portions (returns claim/pickup code) |
| `GET` | `/api/listings/:id/reservations` | List reservations for a specific listing |
| `GET` | `/api/reservations/lookup` | Look up reservation details by contact + pickup code |
| `PATCH` | `/api/reservations/:id/cancel` | Cancel an existing reservation (requires pickup code) |
| `PATCH` | `/api/reservations/:id/collect` | Mark reservation as collected (requires pickup code) |

---

## How Overbooking Is Prevented

Reservations execute through a single atomic `findOneAndUpdate` operation on MongoDB:

1. **Atomic Filter**: Filters for `availableQuantity >= requestedQty` AND `status: 'active'` AND the effective deadline has not passed.
2. **Atomic Decrement**: Decrements `availableQuantity` by `requestedQty` in the exact same write operation. If `availableQuantity` reaches `0`, status is updated to `sold_out`.
3. **Accurate Error Diagnosis**: If the atomic update returns `null` (another request claimed the remaining portions first), the listing is immediately re-queried to return a deterministic error response:
   - `sold_out`: No quantity remains
   - `expired`: Pickup window or shelf-life passed
   - `cancelled`: Donor cancelled the listing
   - `insufficient_quantity`: "Only N portions left"
4. **Rollback Safety**: If the subsequent `Reservation` document insertion encounters an unexpected error, the quantity decrement on the listing is rolled back immediately.

This architecture ensures no two concurrent requests can reserve overlapping portions, delegating consistency enforcement to the database engine.

---

## How Expiry Works

Each listing defines two key timestamps: `expiresAt` (consumption/shelf safety limit) and `pickupEnd` (donor availability window). The listing closes at whichever comes first, defined as the **effective deadline**:

$$\text{Effective Deadline} = \min(\text{expiresAt}, \text{pickupEnd})$$

- **Lazy Expiry**: Whenever a listing is fetched or an attempt is made to reserve portions, the system verifies the effective deadline against the current clock time. If passed, the listing is dynamically treated and stored as expired.
- **Cron Sweep**: A background scheduled job runs every 60 seconds (and triggers once at server initialization) to bulk-update active listings whose effective deadline has passed to `expired` status, and marks any remaining uncollected reservations as `no_show`.

---

## Concurrency Test

A dedicated load script validates reservation concurrency under high-contention scenarios:

```bash
# Start the server first, then execute:
cd server
npm run test:concurrency
```

This test:
1. Creates a listing with an `availableQuantity` of 5.
2. Dispatches 20 simultaneous reservation requests (each requesting 1 unit) concurrently.
3. Asserts the invariant:
   - Exactly **5 requests succeed** (`HTTP 201 Created`)
   - Exactly **15 requests fail** (`HTTP 409 Conflict`)
   - Final `availableQuantity = 0` and listing status is `sold_out`

---

## Deployment

### Step 1: MongoDB Atlas
1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user with read and write permissions.
3. Add `0.0.0.0/0` to the IP Access List (required for dynamic hosting environments like Render).
4. Copy your connection string: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/shareplate?retryWrites=true&w=majority`.

### Step 2: Deploy API on Render
1. Push your repository to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your repository and configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in the Render dashboard:
   - `MONGODB_URI`: your Atlas connection string
   - `CLIENT_ORIGIN`: your frontend URL (e.g., `https://shareplate.vercel.app`)
   - `NODE_ENV`: `production`
5. Alternatively, deploy using the included `render.yaml` blueprint.

### Step 3: Deploy Client on Vercel
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Configure environment variable:
   - `VITE_API_URL`: your deployed Render API URL (e.g., `https://shareplate-api.onrender.com/api`)
5. Click **Deploy**. SPA routing rewrites are handled by `vercel.json` automatically.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **CORS errors** | Ensure `CLIENT_ORIGIN` in the server environment includes your frontend domain without a trailing slash (use comma-separated values for multiple origins). |
| **404 on page refresh** | The included `client/vercel.json` and `client/public/_redirects` files rewrite routes to `index.html`. If using Apache/Nginx, configure fallback rewrite rules for single-page applications. |
| **Atlas connection fails** | Ensure `0.0.0.0/0` is added to your MongoDB Atlas IP allowlist and verify your username/password in the connection string URI. |
| **Slow first request** | Free Render instances enter sleep mode after 15 minutes of inactivity. Initial startup can take 30–60 seconds. The `/api/health` endpoint can be pinged periodically to keep the instance warm. |
| **Cron not running** | The expiry cron job runs inside the Node.js API process. On free hosting tiers that sleep, background cron execution pauses until incoming traffic wakes the server. Lazy expiry guarantees safety on user interaction regardless. |

---

## Project Structure

```
shareplate/
├── client/                 # React frontend
│   ├── src/
│   │   ├── api/            # Axios client & API functions
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (Toast)
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Route pages
│   │   └── styles/         # Global CSS & variables
│   ├── vercel.json
│   └── vite.config.js
├── server/                 # Express API
│   ├── src/
│   │   ├── config/         # DB & env config
│   │   ├── models/         # Mongoose models
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   └── cron/           # Scheduled tasks
│   └── scripts/            # Seed & test scripts
├── render.yaml             # Render deployment config
├── .gitignore
└── README.md
```

---

## License

[MIT](LICENSE)
