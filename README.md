# PayPilot

<div align="left">

[![PayPal API](https://img.shields.io/badge/PayPal-Subscriptions%20v1%20REST-003087?style=flat-square&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![Next.js 16](https://img.shields.io/badge/Next.js-16%20App%20Router-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![AG Grid](https://img.shields.io/badge/AG%20Grid-React%20v33-E0234E?style=flat-square)](https://www.ag-grid.com)
[![Channel3](https://img.shields.io/badge/Channel3-Product%20Graph-7C3AED?style=flat-square)](https://channel3.ai)

</div>

> Autonomous recurring spend guardian and subscription management engine powered by PayPal.

PayPilot prevents silent subscription leakage, unannounced price increases, and forgotten renewals. It pairs glanceable financial metrics with direct programmatic control over **PayPal Subscriptions REST APIs** and **Vigil**, an autonomous agent that flags low-utility commitments and prepares one-tap billing actions.

---

## ⚡ Core Capabilities

* **💳 Direct PayPal Subscriptions Control:** Programmatically inspects, cancels (`/v1/billing/subscriptions/{id}/cancel`), and suspends (`/v1/billing/subscriptions/{id}/suspend`) recurring billing agreements via live OAuth2 Sandbox.
* **🛡️ Vigil Autonomous Intelligence:** Identifies redundant SaaS licenses and low-utilization subscriptions (<40% utility) with human-in-the-loop confirmation before any destructive financial mutation.
* **✨ High-Density Fluid Interface:** Translucent frosted materials, system typography, and tabular figures (`tabular-nums`) designed for focused financial monitoring.
* **🌍 75+ Currency Engine:** Instant 1-click toggles for primary currencies (USD, EUR, INR, RUB) and full-text country/currency lookup.
* **📊 Enterprise Financial Grid:** High-density subscription table powered by AG Grid with multi-column sorting, usage meters, and direct action dispatchers.
* **🛍️ Perpetual Alternative Discovery:** Scans 100M+ products via Channel3 API to suggest one-time lifetime purchases that replace expensive recurring fees.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions, Route Handlers) |
| **Language** | TypeScript 5 (Strict Mode) |
| **Styling** | Tailwind CSS v4, PostCSS, Custom Fluid Design Tokens |
| **Data Grid** | AG Grid React v33 |
| **APIs** | PayPal REST Subscriptions v1, Channel3 Universal Product Graph |
| **Deployment** | Render (`render.yaml`), Vercel |

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/your-username/PayPilot.git
cd PayPilot
npm install
```

### 2. Environment Setup
Create `.env.local` in the project root:
```env
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com

# Optional Integrations
GEMINI_API_KEY=your_gemini_api_key
CHANNEL3_API_KEY=your_channel3_api_key
ZAPIER_WEBHOOK_URL=your_zapier_catch_hook_url
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📮 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/paypal/subscription` | Executes live `CANCEL` or `SUSPEND` actions on PayPal agreements |
| `GET` | `/api/channel3/search` | Queries one-time lifetime software/hardware alternatives |
| `POST` | `/api/zapier/webhook` | Dispatches lifecycle events to team notification webhooks |

---

## 🏆 Hackathon Tracks & Features

* **PayPal Agentic Commerce:** Vigil autonomously audits subscriptions and executes lifecycle changes directly through PayPal REST APIs with user authorization.
* **AG Grid Financial Table:** Embedded enterprise data grid for multi-currency subscription tracking.
* **Channel3 Product Graph:** Discovers perpetual software and hardware alternatives to recurring subscriptions.
* **Zapier Automations:** Event-driven workflow dispatch on subscription state changes.
* **Render Deployment:** Declarative cloud deployment blueprint via `render.yaml`.
* **Postman API Suite:** Complete test collection in `postman_collection.json`.
