# Lore

Ordering, payments, and point-of-sale web app for Lore Coffee Station. *Coffee · Anytime · Everywhere.*

## Overview

Lore Coffee Station is a small coffee shop and mobile espresso bar on Diversion Road in Jaro, Iloilo City, and it's one of my favorite spots. I built this app for them. Customers can check the menu, set up their drink the way they like it, order ahead, and pay online. The cashier gets a register for walk-ins and a live list of every order, so nobody has to ask "is my order ready?" anymore.

Everything on the site comes from Lore itself: the menu, the photos, the opening hours, and the payment fees they post on their Instagram.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express, hosted on Vercel
- Cloud Firestore (database and live updates) and Firebase Authentication, on the free Spark plan
- Zustand

## Features

**For customers**
- Menu with search and categories
- Choose hot or iced, 12 or 16 oz, fresh or oat milk, sweetness level, and add-ons like an extra shot
- Order for dine-in, takeout, or a scheduled pickup
- Pay online with QR Ph (GCash, Maya) or bank transfer, or pay with cash or card at the counter
- Promo codes and Lore Points (1 point for every ₱50 spent, 1 point = ₱1 off)
- Live order tracking from received to preparing to ready
- Inquiry form for booking the coffee cart or food packs for events

**For staff**
- PIN sign-in, with separate cashier and manager access
- Register for walk-in orders with quick cash buttons and change
- Senior Citizen and PWD discount, open tabs, and printable receipts
- Order queue with a sound alert for new online orders
- Confirm QR and bank transfer payments using the customer's reference number
- Kitchen display with New, Preparing, and Ready columns
- "Now serving" board for a TV at the counter
- Mark items as sold out instantly
- Manager tools for prices, menu items, promo codes, event inquiries, and daily sales reports

## Payments

| Method | Fee |
| --- | --- |
| Cash | None |
| QR Ph · GCash · Maya | 1% |
| Bank transfer | None |
| Credit / debit card (counter terminal) | 3% |

The fees match what Lore charges in store. Totals, discounts, and fees are all calculated on the server, so the price can't be changed from the browser.

QR and bank transfer only show up at online checkout once the shop's details are filled in under `PAYMENT_ACCOUNTS` in `src/shared/store-info.ts`. Until then, online customers pay cash at the counter. Online card payments need a real gateway (PayMongo, Xendit, or Maya Checkout) and aren't offered yet.

## How it runs

- **Website and API:** Vercel serves the built React app, and runs the Express API in `server/app.ts` as a serverless function in Singapore (`api/index.ts`). Everything is free, no card needed.
- **Database:** everything is stored in Cloud Firestore: menu, orders, customers and points, promo codes, inquiries, and staff. Only the API writes to it.
- **Live updates:** whenever something changes, the API also writes a small public copy (`publicOrders/{id}`, `public/board`, `public/menu`). Order tracking, the "Now serving" board and menus listen to those. Signed-in staff listen to the full `orders` and `inquiries`. `firestore.rules` controls who can read what.

## Setup (once)

You need Node.js 22.5 or newer.

**Firebase** (free Spark plan, project `lore-coffee-station`):

1. Create a **Firestore database** in production mode, location `asia-southeast1` (Singapore).
2. Open **Authentication** and click **Get started**. No sign-in providers are needed, because staff sign in with their PIN.
3. Add a **Web app** under Project settings › General, and copy its `apiKey` and `appId` into `.env` (start from `.env.example`).
4. Under Project settings › Service accounts, click **Generate new private key**. Save the file in this folder as `firebase-admin-key.json`. Keep it private: it has full access to the database. Never paste it into chats or commit it (it's in `.gitignore`).

**On your computer:**

```bash
npm install
npm run deploy:rules        # uploads firestore.rules (uses the key file, no login needed)
npm run seed                # adds the menu and promo codes, and prints the staff PINs once
```

**Vercel** (free Hobby plan, no card):

1. Push this repo to GitHub.
2. On vercel.com, choose **Add New › Project** and import the repo. `vercel.json` already sets the build, the Singapore region, and the routes.
3. Under **Environment Variables**, add:
   - `FIREBASE_SERVICE_ACCOUNT`: the whole contents of the key file
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`: the same values as in `.env`
4. Deploy. Vercel gives you a `https://<project>.vercel.app` address, and every push to GitHub redeploys it.

Vercel's Hobby plan is meant for personal, non-commercial projects. Once Lore takes real orders, move to a paid plan or another host.

## Local development

```bash
npm run dev
```

Open `http://localhost:5180`. The API runs on port 3001 and uses the **real** Firestore in your project, with the key in `firebase-admin-key.json`. Anything you do locally shows up in the live data, so use a separate Firebase project if you want a sandbox.

Run the tests with `npm test`. They use an in-memory copy of the database and don't touch Firebase.

## Staff PINs

Staff sign in at `/staff` with a 4-digit PIN. PINs are stored hashed in Firestore and never kept in the repo. `npm run seed` creates the accounts with random PINs and prints them once. You can also set them ahead of time with `STAFF_CASHIER_PIN` and `STAFF_MANAGER_PIN` in `.env`. To change a PIN at any time:

```bash
npm run set-pin -- manager 4821
```

A sign-in lasts one 14-hour shift. After 5 wrong PINs from one device, or 30 overall, sign-in is locked for 15 minutes.

## Backups

- `npm run backup` saves every collection to `backups/lore-<date>.json` on your computer.
- For automatic backups, turn on a daily backup schedule in the Firebase console under Firestore › Disaster recovery.

## Project Structure

- `src/pages/` has the customer pages: home, menu, checkout, order tracking, events, and the "Now serving" board
- `src/pages/staff/` has the staff screens: register, orders, kitchen, menu, events, reports, and promos
- `src/components/` has the shared UI like the site layout, drink options, receipt, and modals
- `src/shared/` has the types, pricing rules, and store details used by both the app and the server
- `src/store/` has the cart and staff session
- `src/lib/` has the API client, the Firebase connection, and the live-update helpers
- `server/` is the Express API: routes (`app.ts`), order and payment rules (`orders.ts`), Firestore access (`db.ts`), and the starting data (`seed.ts`). `index.ts` starts the server.
- `vercel.json` and `api/` are the Vercel setup, and `firestore.rules` decides what browsers may read from Firestore
- `raw-images/` has the original photos, and `public/images/` has the versions used on the site
- `scripts/` sets up a new project (`npm run seed`), changes staff PINs (`npm run set-pin`), backs up the database (`npm run backup`), and regenerates the site images (`npm run optimize-images`)

## Purpose

I made Lore because I wanted my favorite coffee shop to have a proper online home, one where ordering, paying, and running the counter all happen in the same place.
