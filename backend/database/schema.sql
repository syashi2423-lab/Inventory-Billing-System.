-- ============================================================================
-- MUNNEM — Smart Retail ERP / Retail Management System
-- Complete Multi-Tenant MySQL Database Schema
-- ============================================================================

CREATE DATABASE IF NOT EXISTS munnem_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE munnem_erp;

-- 1. Businesses (Tenants) Table
CREATE TABLE IF NOT EXISTS businesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(120) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  city VARCHAR(80) DEFAULT '',
  state VARCHAR(80) DEFAULT '',
  pin_code VARCHAR(20) DEFAULT '',
  gstin VARCHAR(20) DEFAULT '',
  registration_type VARCHAR(40) DEFAULT 'Regular',
  composition_scheme TINYINT(1) NOT NULL DEFAULT 0,
  invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
  next_invoice_number INT NOT NULL DEFAULT 1,
  next_po_number INT NOT NULL DEFAULT 1,
  payment_terms VARCHAR(120) DEFAULT 'Due on receipt',
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
  currency_locale VARCHAR(20) NOT NULL DEFAULT 'en-IN',
  low_stock_default INT NOT NULL DEFAULT 10,
  tpl_accent VARCHAR(20) NOT NULL DEFAULT '#10A37F',
  tpl_size VARCHAR(20) NOT NULL DEFAULT 'A4',
  tpl_header VARCHAR(200) DEFAULT '',
  tpl_footer TEXT,
  tpl_logo MEDIUMTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table (Role-Based Access Control: owner, manager, cashier)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'owner',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_business (business_id),
  CONSTRAINT fk_users_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tax Rates Table (Per-Business GST / Tax Slabs)
CREATE TABLE IF NOT EXISTS tax_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(60) NOT NULL,
  rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tax_rates_business (business_id),
  CONSTRAINT fk_tax_rates_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Products Table (Catalogue & Current Inventory)
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(60) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Groceries',
  hsn_code VARCHAR(30) DEFAULT '',
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock_quantity INT NOT NULL DEFAULT 0,
  min_stock_level INT NOT NULL DEFAULT 10,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_product_sku (business_id, sku),
  INDEX idx_products_business (business_id),
  INDEX idx_products_category (business_id, category),
  CONSTRAINT fk_products_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Stock Movements Table (Inventory Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  product_id INT NULL,
  product_name VARCHAR(150) NOT NULL,
  sku VARCHAR(60) NOT NULL,
  movement_type ENUM('Opening Stock', 'Stock In', 'Stock Out', 'Adjustment', 'Sale', 'Purchase') NOT NULL,
  quantity_change INT NOT NULL,
  balance_after INT NOT NULL,
  reference VARCHAR(150) DEFAULT '',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_movements_business_date (business_id, created_at),
  INDEX idx_movements_product (product_id),
  CONSTRAINT fk_movements_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_movements_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  city VARCHAR(80) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  gstin VARCHAR(20) DEFAULT '',
  credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_business (business_id),
  CONSTRAINT fk_customers_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(150) DEFAULT '',
  gstin VARCHAR(20) DEFAULT '',
  address VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_business (business_id),
  CONSTRAINT fk_suppliers_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(120) NOT NULL DEFAULT 'Walk-in Customer',
  supply_type ENUM('same', 'other') NOT NULL DEFAULT 'same',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_tax DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'Cash',
  payment_status ENUM('Paid', 'Partial', 'Unpaid') NOT NULL DEFAULT 'Paid',
  notes VARCHAR(255) DEFAULT '',
  invoice_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_invoice_number (business_id, invoice_number),
  INDEX idx_invoices_business_date (business_id, invoice_date),
  INDEX idx_invoices_customer (customer_id),
  CONSTRAINT fk_invoices_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  invoice_id INT NOT NULL,
  product_id INT NULL,
  service_id INT NULL,
  item_type ENUM('product', 'service') NOT NULL DEFAULT 'product',
  product_name VARCHAR(150) NOT NULL,
  sku VARCHAR(60) DEFAULT '',
  category VARCHAR(80) DEFAULT 'Groceries',
  quantity INT NOT NULL DEFAULT 1,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_share DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  taxable_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  INDEX idx_invoice_items_invoice (invoice_id),
  INDEX idx_invoice_items_business (business_id),
  INDEX idx_invoice_items_product (product_id),
  CONSTRAINT fk_invoice_items_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id)
    REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Customer Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  payment_code VARCHAR(50) NOT NULL,
  invoice_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  customer_id INT NULL,
  customer_name VARCHAR(120) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'Cash',
  reference VARCHAR(150) DEFAULT '',
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_business_date (business_id, payment_date),
  INDEX idx_payments_invoice (invoice_id),
  CONSTRAINT fk_payments_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id)
    REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  po_number VARCHAR(50) NOT NULL,
  supplier_id INT NOT NULL,
  supplier_name VARCHAR(120) NOT NULL,
  order_date DATE NOT NULL,
  status ENUM('Draft', 'Ordered', 'Received', 'Cancelled') NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  note VARCHAR(255) DEFAULT '',
  received_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_po_number (business_id, po_number),
  INDEX idx_po_business (business_id),
  INDEX idx_po_supplier (supplier_id),
  CONSTRAINT fk_po_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  purchase_order_id INT NOT NULL,
  product_id INT NULL,
  sku VARCHAR(60) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  INDEX idx_po_items_order (purchase_order_id),
  CONSTRAINT fk_po_items_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_order FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  expense_code VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Other',
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes VARCHAR(255) DEFAULT '',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expenses_business_date (business_id, expense_date),
  CONSTRAINT fk_expenses_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Services Table (Non-stock billable services)
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(40) NOT NULL DEFAULT 'job',
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_services_business (business_id),
  CONSTRAINT fk_services_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bank & Cash Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  account_type ENUM('Bank', 'Cash', 'Wallet') NOT NULL DEFAULT 'Bank',
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bank_accounts_business (business_id),
  CONSTRAINT fk_bank_accounts_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Bank Transactions Table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  account_id INT NOT NULL,
  tx_type ENUM('Deposit', 'Withdrawal', 'Transfer in', 'Transfer out') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tx_date DATE NOT NULL,
  note VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bank_tx_business (business_id, tx_date),
  INDEX idx_bank_tx_account (account_id),
  CONSTRAINT fk_bank_tx_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_tx_account FOREIGN KEY (account_id)
    REFERENCES bank_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Purchase List (Saved Reorder Suggestions)
CREATE TABLE IF NOT EXISTS purchase_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  product_id INT NULL,
  sku VARCHAR(60) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_purchase_sku (business_id, sku),
  CONSTRAINT fk_purchase_list_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  detail VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_business_date (business_id, created_at),
  CONSTRAINT fk_audit_business FOREIGN KEY (business_id)
    REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
