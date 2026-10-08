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
- Express
- Socket.IO
- SQLite
- Zustand

## Features

**For customers**
- Menu with search and categories
- Choose hot or iced, 12 or 16 oz, fresh or oat milk, sweetness level, and add-ons like an extra shot
- Order for dine-in, takeout, or a scheduled pickup
- Pay with QR Ph (GCash, Maya), credit or debit card, bank transfer, or cash at the counter
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
| Credit / debit card | 3% |

The fees match what Lore charges in store. Totals, discounts, and fees are all calculated on the server, so the price can't be changed from the browser.

## Local Setup

You need Node.js 22.5 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5180`. The API runs on port 3001.

For the production build:

```bash
npm run build
npm start
```

Then open `http://localhost:3001`.

The database is created automatically in `data/lore.db` the first time the server starts, along with the menu, promo codes, and staff accounts from `server/seed.ts`. Staff sign in at `/staff`.

## Project Structure

- `src/pages/` has the customer pages: home, menu, checkout, order tracking, events, and the "Now serving" board
- `src/pages/staff/` has the staff screens: register, orders, kitchen, menu, events, reports, and promos
- `src/components/` has the shared UI like the site layout, drink options, receipt, and modals
- `src/shared/` has the types, pricing rules, and store details used by both the app and the server
- `src/store/` has the cart and staff session
- `server/` is the Express API: routes and live updates (`index.ts`), order and payment rules (`orders.ts`), the database (`db.ts`), and the starting data (`seed.ts`)
- `raw-images/` has the original photos, and `public/images/` has the versions used on the site
- `scripts/` regenerates the site images (`npm run optimize-images`)

## Purpose

I made Lore because I wanted my favorite coffee shop to have a proper online home, one where ordering, paying, and running the counter all happen in the same place.
