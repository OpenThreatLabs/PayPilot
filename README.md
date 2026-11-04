# 🛡️ PayPilot — Autonomous Subscription Guardian & Spend Engine

> **"Your Autonomous Recurring Spend Guardian powered by PayPal and Vigil AI"**

PayPilot is an intelligent financial assistant and autonomous subscription management platform designed for modern consumers and teams. Built for the global **PayPal "Build What's Next with PayPal and AI" Hackathon**, PayPilot eliminates subscription sprawl, unnoticed renewals, duplicate SaaS tools, and hidden price hikes by directly interfacing with **PayPal's Subscriptions Management APIs** alongside **Vigil**, its dedicated autonomous financial agent.

---

## ⚡ Key Capabilities

### 🛡️ **Vigil: Autonomous Financial Intelligence**
* **⚡ Proactive Spend Analysis:** Evaluates recurring usage, flags idle commitments, and identifies overlapping software subscriptions.
* **🔒 Human-in-the-Loop Safeguards:** All sensitive financial mutations (cancellations, suspensions) require explicit one-tap user confirmation before executing on PayPal.
* **📉 Price Creep Detection:** Tracks billing cycle price deltas and highlights silent subscription increases.
* **⚠️ Transparent Risk Disclaimers:** Apple-grade frosted modal informing users of non-reversible subscription cancellations and execution terms.

### 💳 **Direct PayPal Platform Integration**
* **🔗 PayPal REST Subscriptions API:** Direct programmatic control over live billing agreements:
  * `POST /v1/billing/subscriptions/{id}/cancel` — Terminate unwanted subscriptions.
  * `POST /v1/billing/subscriptions/{id}/suspend` — Temporarily pause recurring billing.
  * `GET /v1/billing/subscriptions/{id}` — Retrieve real-time agreement status and billing cycles.
* **🔑 OAuth2 Sandbox Auth:** Real-time token lifecycle against `api-m.sandbox.paypal.com` with graceful simulated fallbacks.

###  **Apple Fluid Design System**
* **✨ Glassmorphic Materials:** Translucent blur surfaces (`backdrop-filter: blur(20px)`), frosted borders, and subtle depth elevation.
* **📐 SF Typography & Optical Sizing:** Clean hierarchy with tight display tracking and tabular numerical alignment (`tabular-nums`).
* **🎛️ Responsive Navigation Shell:** Floating header with collapsible sidebar, instant search trigger (`⌘K`), and live currency switcher.
* **🌍 Global Currency Engine:** Fast 1-click toggles for primary currencies (USD, EUR, INR, RUB) and full-text search across 75+ global currencies and country aliases.

### 🌐 **Sponsor Ecosystem Integrations**
* **📊 AG Grid:** High-performance tabular data grid featuring multi-column sorting, instant filtering, and custom usage meters.
* **🛍️ Channel3 Product Graph API:** Live discovery across 100M+ products and 25,000+ merchants to suggest lifetime deals and one-time purchase alternatives.
* **⚡ Zapier Automation Webhooks:** Event dispatcher emitting cancellation alerts to external workflows (Slack, Notion, Discord).
* **📦 Postman Collection:** Comprehensive v2.1 collection (`postman_collection.json`) documenting every internal agent and PayPal Sandbox API endpoint.
* **☁️ Render Blueprint:** Declarative `render.yaml` Infrastructure-as-Code specification for zero-config production deployment.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | High-performance React Server Components & API route handlers |
| **Language** | TypeScript 5 | Strict static typing across schemas, API payloads, and state |
| **Styling & Motion** | Tailwind CSS v4 & PostCSS | Apple-grade physics, responsive glass panels, critically damped springs |
| **Grid Engine** | AG Grid React v33 | Enterprise financial grid with custom renderers and quick filters |
| **Payments** | PayPal REST Subscriptions v1 | Direct OAuth2 and billing agreement lifecycle execution |
| **Catalog API** | Channel3 API | Semantic product search and perpetual alternative deal discovery |
| **Deployment** | Render / Vercel | Declarative blueprint via `render.yaml` |

---

## 🚀 Getting Started

### 1️⃣ Clone & Install
```bash
git clone https://github.com/your-username/PayPilot.git
cd PayPilot
npm install
```

### 2️⃣ Configure Environment
Create a `.env.local` file in your project root:
```env
# 💳 PayPal Sandbox Credentials (https://developer.paypal.com)
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# 🤖 Vigil AI Engine (Optional - heuristic fallback included)
GEMINI_API_KEY=your_gemini_api_key

# 🛍️ Sponsor Integrations (Optional)
CHANNEL3_API_KEY=your_channel3_api_key
ZAPIER_WEBHOOK_URL=your_zapier_catch_hook_url
```

### 3️⃣ Run Locally
```bash
npm run dev
```
Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4️⃣ Build for Production
```bash
npm run build
```

---

## 📮 API & Postman Testing

PayPilot includes a pre-configured Postman collection (`postman_collection.json`):
1. Import `postman_collection.json` into Postman.
2. Set the `baseUrl` variable to `http://localhost:3000`.
3. Execute endpoints for:
   * 💳 `POST /api/paypal/subscription` (Cancel/Suspend)
   * 🛍️ `GET /api/channel3/search` (Alternative product deals)
   * ⚡ `POST /api/zapier/webhook` (Event emission)

---

## 🏆 Hackathon Eligibility & Awards

* **🥇 Main Track — Best Use of Agentic Commerce ($5,000):** Vigil acts as an autonomous agent that directly controls PayPal Subscriptions via REST APIs while respecting user consent boundaries.
* **📊 Best Use of AG Grid:** Embedded financial tracking table with advanced sorting, custom cell renderers, and batch actions.
* **🛍️ Best Use of Channel3 ($2,000):** Real-time product graph lookups that convert high recurring SaaS bills into perpetual lifetime software and hardware alternatives.
* **⚡ Best Use of Zapier:** Instant webhook event dispatches upon subscription lifecycle changes.
* **☁️ Best Project on Render:** Declarative cloud blueprint deployment via `render.yaml`.
* **📮 Best Use of Postman:** End-to-end API documentation and ready-to-test request suites.
