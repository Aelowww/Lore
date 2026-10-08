# Lore

Online ordering, payments, and point-of-sale web app for Lore Coffee Station. *Coffee · Anytime · Everywhere.*

## Overview

Lore Coffee Station is a coffee shop and mobile espresso bar on Diversion Road, Jaro, Iloilo City. I built this app for a coffee shop I love: customers can browse the menu, customize their drinks, order ahead, pay online, and watch their order go from the bar to "ready" in real time. On the other side of the counter, the cashier rings up walk-ins, confirms payments, and moves orders through a kitchen display, all updating live without refreshing. The menu items, photos, hours, and payment fees come from Lore's own Instagram, Facebook, and Google Maps pages.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Express
- Socket.IO
- SQLite (Node's built-in `node:sqlite`)
- Zustand

## Features

**For customers**
- Home page with signature drinks, a menu board, ways to order, the coffee cart, Lore Points, an Instagram gallery, and a map with opening hours
- Menu with search and categories, plus drink options for temperature, size, milk, sweetness, and add-ons
- Dine in, takeout, or schedule a pickup (pickup only while the shop is closed)
- Promo codes and Lore Points: 1 point for every ₱50, and each point is ₱1 off
- Pay with QR Ph (GCash, Maya), credit or debit card, bank transfer, or cash at the counter
- Live order tracking from received to preparing to ready, plus a list of orders placed on the device
- Event inquiry form for the mobile coffee cart and food packs

**For staff**
- Staff sign in with a 4-digit PIN; managers get extra screens
- Register (POS) for walk-in orders with cash change, Senior Citizen / PWD 20% discount, promo codes, and open tabs
- Order queue with a sound for new online orders, payment confirmation for QR and bank transfers, cash collection, cancellations, and refunds
- Kitchen display with New, Preparing, and Ready columns that flags orders waiting over 15 minutes
- Mark items sold out instantly (customers see it live); managers can edit prices and add items
- Printable receipts for 58 mm and 80 mm thermal printers
- "Now serving" board for a TV at the counter
- Daily sales report by hour, payment method, and top items (manager only)
- Promo code manager and event inquiry inbox

## Payments

| Method | Fee | How it works |
| --- | --- | --- |
| **Cash** | None | Paid at the counter. The cashier enters the cash received and the app shows the change. |
| **QR Ph · GCash · Maya** | 1% | The customer scans, pays, and submits the reference number. The cashier confirms it was received. |
| **Bank transfer** | None | Same as QR: transfer, submit the reference number, and the cashier confirms it. |
| **Credit / debit card** | 3% | Built-in **demo gateway**: nothing is charged and card numbers are never stored. Test cards: `4242 4242 4242 4242` (approved) and `4000 0000 0000 0002` (declined). |

Fees follow the rates Lore posts on Instagram. All prices, discounts, and fees are calculated on the server, so the total can't be changed from the browser. To take real card payments, replace `payOnline()` in `server/orders.ts` with PayMongo, Xendit, or Maya Checkout.

## Local Setup

Requires Node.js 22.5 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5180`. The API runs on port 3001.

To run the production build:

```bash
npm run build
npm start
```

Then open `http://localhost:3001`.

### Staff accounts

Go to `/staff` and enter a PIN:

| Role | PIN | Access |
| --- | --- | --- |
| Cashier | `1234` | Register, Orders, Kitchen, Menu (sold out only), Events |
| Manager | `9999` | Everything, plus Reports, Promos, and menu editing |

Change these in `server/seed.ts` before the first run. The database is created in `data/lore.db` on first start; delete it to reset to the starting menu.

### Before going live

- Menu prices are placeholders. Update them under **Staff → Menu** with the manager account.
- The QR code and bank accounts are placeholders. Edit `PAYMENT_ACCOUNTS` in `src/shared/store-info.ts`, and put the shop's QR Ph image in `public/images/`.
- Change the staff PINs.

## Project Structure

- `src/pages/` contains the customer pages: home, menu, checkout, order tracking, events, and the "Now serving" board
- `src/pages/staff/` contains the staff screens: register, orders, kitchen, menu, events, reports, and promos
- `src/components/` holds shared UI like the site layout, item options dialog, receipt, and modals
- `src/shared/` holds types, pricing, and store info (hours, address, payment accounts) used by both the app and the server
- `src/store/` holds the cart and staff session
- `server/` is the Express API: routes and live updates (`index.ts`), order and payment rules (`orders.ts`), database (`db.ts`), and the starting menu, promo codes, and staff (`seed.ts`)
- `raw-images/` stores the original photos, and `public/images/` stores the web-ready versions
- `scripts/` regenerates the images (`npm run optimize-images`) and the brand texture from the logo

## Purpose

I built Lore as a personal project for a coffee shop I love, to bring its menu, ordering, and counter work into one place, from a customer's first tap to the cashier's receipt.
