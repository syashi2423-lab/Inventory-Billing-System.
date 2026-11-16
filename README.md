# MUNNEM — Smart Retail ERP (Full-Stack Node.js + Express + MySQL)

MUNNEM is a production-ready, multi-business, full-stack Smart Retail ERP and Point-of-Sale (POS) web application built with **Node.js**, **Express.js**, and **MySQL**, preserving the original MUNNEM theme, dark/light mode, responsive layout, and 12-language Indian localization while moving all data persistence and calculations to a secure relational MySQL backend.

---

## 1. Project Folder Structure

```text
munnem-retail-erp/
├── frontend/
│   ├── index.html                  # Main SPA entry point (responsive desktop & mobile)
│   ├── css/
│   │   └── styles.css              # Original MUNNEM design, dark/light themes, print & mobile layout
│   └── js/
│       ├── api.js                  # REST API service client (fetch with HTTP-only cookie credentials)
│       ├── i18n.js                 # 12 Indian languages + English translation engine
│       └── app.js                  # Complete frontend application logic connected to REST APIs
├── backend/
│   ├── server.js                   # Express server entry point & static file host
│   ├── config/
│   │   ├── env.js                  # Environment variable loader
│   │   └── db.js                   # MySQL connection pool (mysql2/promise), transactions & audit logger
│   ├── database/
│   │   ├── schema.sql              # Complete 18-table multi-tenant MySQL database schema
│   │   └── initDb.js               # Automated database & table initialization script
│   ├── middleware/
│   │   ├── auth.js                 # JWT HTTP-only cookie verification & Role-Based Access Control (RBAC)
│   │   ├── errorHandler.js         # Centralized error handling middleware
│   │   └── validate.js             # Request input & GSTIN/numeric validation helpers
│   ├── models/
│   │   └── index.js                # Multi-tenant database query helpers scoped by business_id
│   ├── services/
│   │   ├── authService.js          # Business registration (empty workspace), login & bcrypt hashing
│   │   ├── dashboardService.js     # Real-time dashboard & workspace aggregation from MySQL
│   │   ├── invoiceService.js       # Transactional billing, GST math, stock deduction & payment ledger
│   │   └── purchaseOrderService.js # Supplier PO workflow & automatic stock-in on receipt
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── businessController.js
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── inventoryController.js
│   │   ├── customerController.js
│   │   ├── invoiceController.js
│   │   ├── paymentController.js
│   │   ├── supplierController.js
│   │   ├── purchaseOrderController.js
│   │   ├── expenseController.js
│   │   ├── financeController.js
│   │   ├── serviceController.js
│   │   └── reportController.js
│   └── routes/
│       ├── index.js                # Master /api router
│       ├── authRoutes.js
│       ├── businessRoutes.js
│       ├── userRoutes.js
│       ├── productRoutes.js
│       ├── inventoryRoutes.js
│       ├── customerRoutes.js
│       ├── invoiceRoutes.js
│       ├── paymentRoutes.js
│       ├── supplierRoutes.js
│       ├── purchaseOrderRoutes.js
│       ├── expenseRoutes.js
│       ├── financeRoutes.js
│       ├── serviceRoutes.js
│       └── reportRoutes.js
├── package.json                    # Node.js dependencies and npm scripts
├── .env.example                    # Template for environment variables
└── README.md                       # Complete setup & API documentation
```

---

## 2. Beginner-Friendly Step-by-Step Setup Guide

### Step 1: Install Required Software

1. **Install Node.js (v18 or newer)**:
   - Download the **LTS** installer from [https://nodejs.org/](https://nodejs.org/).
   - Run the installer and keep the default options checked.
   - Open your terminal (Command Prompt / PowerShell on Windows, or Terminal on macOS/Linux) and verify:
     ```bash
     node -v
     npm -v
     ```

2. **Install MySQL Server (v8.0 or newer)**:
   - **Windows**: Download **MySQL Installer** from [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/), select **MySQL Server** and **MySQL Workbench**, and set a `root` password during setup.
   - **macOS**: Install via Homebrew (`brew install mysql && brew services start mysql`) or the official DMG installer from [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/).
   - **Ubuntu / Debian Linux**:
     ```bash
     sudo apt update
     sudo apt install mysql-server -y
     sudo systemctl start mysql
     ```

---

### Step 2: Configure Environment Variables

1. Extract the project folder `munnem-retail-erp` and open a terminal inside it:
   ```bash
   cd munnem-retail-erp
   ```
2. Copy `.env.example` to `.env`:
   - **Windows (Command Prompt)**:
     ```cmd
     copy .env.example .env
     ```
   - **macOS / Linux / PowerShell**:
     ```bash
     cp .env.example .env
     ```
3. Open `.env` in any text editor (e.g., VS Code or Notepad) and set your MySQL password:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_root_password
   DB_NAME=munnem_erp

   JWT_SECRET=munnem_super_secret_jwt_key_change_in_production_2026
   JWT_EXPIRES_IN=7d
   COOKIE_SECURE=false
   CLIENT_ORIGIN=http://localhost:3000
   ```

---

### Step 3: Install NPM Packages

Run the following command inside the `munnem-retail-erp` directory:
```bash
npm install
```
This installs `express`, `mysql2`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `cors`, and `dotenv`.

---

### Step 4: Create & Initialize the MySQL Database

You can initialize the `munnem_erp` database and all 18 tables automatically using the built-in script:
```bash
npm run db:init
```
*(Alternatively, you can run the SQL script manually in MySQL Workbench or the MySQL CLI: `mysql -u root -p < backend/database/schema.sql`).*

---

### Step 5: Start the Application

Start the full-stack server (which serves both the `/api` backend and the `/frontend` web application):
```bash
npm start
```
For development with automatic restart on file changes:
```bash
npm run dev
```

Open your browser and visit:
```text
http://localhost:3000
```

---

## 3. Registering Your First Business & Testing Multi-Business Isolation

1. Open `http://localhost:3000` in your browser.
2. Click **"Register a new business"** on the Sign In screen.
3. Enter your **Business / Shop Name**, **Owner Full Name**, **Phone**, **State**, **City**, **GSTIN (optional)**, **Email**, and **Password** (minimum 8 characters), then click **"Create Business Workspace"**.
4. **Fresh Empty Workspace**: Your new business starts with **0 products, 0 customers, 0 invoices, and ₹0 sales** (no hardcoded or demo records).
5. **Add Products & Opening Stock**: Go to **Products → Add Product** and enter product names, SKUs, purchase prices, selling prices, GST rates, and opening stock.
6. **Add Customers**: Go to **Customers → Add Customer** to add customer records and optional credit limits.
7. **Create a Bill**: Go to **Billing & Invoices**, tap products to add them to the bill, choose supply type (`Same state (CGST+SGST)` or `Other state (IGST)`), enter any discount, select payment method (`Cash`, `UPI`, `Card`, or `Credit`), and click **Save Invoice** or **Save & Print**.
8. **Verify Stock & Dashboard**: Check **Inventory** (stock is automatically reduced and a `Sale` stock movement is recorded) and **Overview** (Today's Sales, Orders Today, Money Received, Pending Payments, Gross Profit, and Inventory Value update dynamically).
9. **Test Multi-Business Isolation**: Click your profile avatar in the top-right corner → **Sign out**, then click **"Register a new business"** to register a second business. Verify that the second business has a completely empty workspace while the first business's data remains untouched in MySQL.

---

## 4. REST API Endpoint Reference

All private endpoints require authentication via the `munnem_token` HTTP-only JWT cookie and are automatically scoped to the authenticated user's `business_id`.

| Module | Method | Endpoint | Roles Allowed | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/api/health` | Public | API health status check |
| **Auth** | `POST` | `/api/auth/register` | Public | Register a new business & owner account with an empty workspace |
| **Auth** | `POST` | `/api/auth/login` | Public | Log in with email & password, sets HTTP-only JWT cookie |
| **Auth** | `POST` | `/api/auth/logout` | Public | Clear HTTP-only JWT cookie |
| **Auth** | `GET` | `/api/auth/me` | All | Get current session user & full live MySQL workspace |
| **Business** | `GET` | `/api/business/workspace` | All | Fetch complete business workspace & dynamic dashboard metrics |
| **Business** | `PUT` | `/api/business/settings` | Owner, Manager | Update business profile, address, GSTIN, invoice prefix, currency |
| **Business** | `PUT` | `/api/business/template` | Owner | Update invoice template accent color, paper size, header, footer, logo |
| **Business** | `POST` | `/api/business/taxes` | Owner | Add a custom GST / tax slab |
| **Business** | `DELETE` | `/api/business/taxes/:id` | Owner | Delete a tax slab |
| **Users** | `GET` | `/api/users` | Owner | List staff users in the business |
| **Users** | `POST` | `/api/users` | Owner | Create staff user (`owner`, `manager`, `cashier`) |
| **Users** | `PATCH` | `/api/users/:id/role` | Owner | Update staff user role |
| **Users** | `PATCH` | `/api/users/:id/status` | Owner | Enable or disable staff user account |
| **Users** | `PATCH` | `/api/users/:id/password` | Owner | Reset staff user password |
| **Products** | `GET` | `/api/products` | All | List active products for the business |
| **Products** | `POST` | `/api/products` | Owner, Manager | Create product & log opening stock movement |
| **Products** | `PUT` | `/api/products/:id` | Owner, Manager | Update product details & log stock adjustment if changed |
| **Products** | `DELETE` | `/api/products/:id` | Owner, Manager | Delete product (only if stock is 0 and unused in invoices) |
| **Inventory** | `GET` | `/api/inventory/movements` | Owner, Manager | List timestamped stock movements |
| **Inventory** | `POST` | `/api/inventory/adjust` | Owner, Manager | Record Stock In, Stock Out, or exact Stock Adjustment |
| **Inventory** | `POST` | `/api/inventory/purchase-list` | Owner, Manager | Add product reorder suggestion to purchase list |
| **Inventory** | `DELETE` | `/api/inventory/purchase-list/:sku` | Owner, Manager | Remove item from purchase list |
| **Customers** | `GET` | `/api/customers` | All | List customers with order count, total purchases & outstanding dues |
| **Customers** | `POST` | `/api/customers` | All | Add new customer |
| **Customers** | `PUT` | `/api/customers/:id` | All | Update customer details & credit limit |
| **Customers** | `DELETE` | `/api/customers/:id` | All | Delete customer (if no unpaid balance) |
| **Invoices** | `GET` | `/api/invoices` | All | List all saved invoices with line items |
| **Invoices** | `GET` | `/api/invoices/:id` | All | Get single invoice details, line items & payment history |
| **Invoices** | `POST` | `/api/invoices` | All | Generate invoice in a DB transaction, deduct stock & record payment |
| **Payments** | `GET` | `/api/payments` | All | List customer payment ledger |
| **Payments** | `POST` | `/api/payments` | All | Record payment against an invoice & update invoice status/balance |
| **Suppliers** | `GET` | `/api/suppliers` | Owner, Manager | List suppliers |
| **Suppliers** | `POST` | `/api/suppliers` | Owner, Manager | Add supplier |
| **Suppliers** | `PUT` | `/api/suppliers/:id` | Owner, Manager | Update supplier |
| **Suppliers** | `DELETE` | `/api/suppliers/:id` | Owner, Manager | Delete supplier (if no linked purchase orders) |
| **Purchase Orders** | `GET` | `/api/purchase-orders` | Owner, Manager | List supplier purchase orders |
| **Purchase Orders** | `POST` | `/api/purchase-orders` | Owner, Manager | Create purchase order |
| **Purchase Orders** | `PATCH` | `/api/purchase-orders/:id/status` | Owner, Manager | Mark ordered, cancel, or receive PO (auto-increments stock) |
| **Purchase Orders** | `POST` | `/api/purchase-orders/:id/pay` | Owner, Manager | Record supplier payment against a received PO |
| **Expenses** | `GET` | `/api/expenses` | Owner, Manager | List shop expenses |
| **Expenses** | `POST` | `/api/expenses` | Owner, Manager | Record shop expense |
| **Expenses** | `DELETE` | `/api/expenses/:id` | Owner, Manager | Delete shop expense |
| **Finance** | `POST` | `/api/finance/accounts` | Owner, Manager | Add Bank, Cash, or Wallet account |
| **Finance** | `DELETE` | `/api/finance/accounts/:id` | Owner, Manager | Delete account (if no transactions) |
| **Finance** | `POST` | `/api/finance/transactions` | Owner, Manager | Record Deposit, Withdrawal, or inter-account Transfer |
| **Services** | `GET` | `/api/services` | Owner, Manager | List billable non-stock services |
| **Services** | `POST` | `/api/services` | Owner, Manager | Add billable service |
| **Services** | `PUT` | `/api/services/:id` | Owner, Manager | Update billable service |
| **Services** | `DELETE` | `/api/services/:id` | Owner, Manager | Delete billable service |
| **Reports** | `GET` | `/api/reports/summary` | Owner, Manager | Retrieve full sales, inventory, GST & financial analytics |
