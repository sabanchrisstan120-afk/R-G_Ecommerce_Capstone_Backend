-- ============================================================
-- R&G Trading Air Conditioner E-Commerce Database Schema
-- MySQL Migration
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)      NOT NULL DEFAULT (UUID()),
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  first_name    VARCHAR(100)  NOT NULL,
  last_name     VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  role          ENUM('customer','admin','superadmin') NOT NULL DEFAULT 'customer',
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  email_verified TINYINT(1)   NOT NULL DEFAULT 0,
  last_login_at DATETIME      DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         CHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id    CHAR(36)   NOT NULL,
  token      TEXT       NOT NULL,
  expires_at DATETIME   NOT NULL,
  created_at DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  slug        VARCHAR(100)  NOT NULL,
  description TEXT          DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO categories (name, slug, description) VALUES
  ('Window Type',    'window-type',    'Window-mounted air conditioning units'),
  ('Split Type',     'split-type',     'Split-type air conditioners'),
  ('Portable',       'portable',       'Portable air conditioners'),
  ('Cassette Type',  'cassette-type',  'Ceiling cassette air conditioners'),
  ('Floor Standing', 'floor-standing', 'Floor-standing air conditioners');

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                  CHAR(36)       NOT NULL DEFAULT (UUID()),
  category_id         INT            DEFAULT NULL,
  name                VARCHAR(255)   NOT NULL,
  model_number        VARCHAR(100)   NOT NULL,
  brand               VARCHAR(100)   NOT NULL,
  description         TEXT           DEFAULT NULL,
  horsepower          DECIMAL(4,2)   DEFAULT NULL,
  cooling_capacity_btu INT           DEFAULT NULL,
  energy_rating       VARCHAR(20)    DEFAULT NULL,
  price               DECIMAL(12,2)  NOT NULL,
  stock_qty           INT            NOT NULL DEFAULT 0,
  image_url           TEXT           DEFAULT NULL,
  is_active           TINYINT(1)     NOT NULL DEFAULT 1,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_model (model_number),
  KEY idx_products_category (category_id),
  KEY idx_products_brand (brand),
  KEY idx_products_active (is_active),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id         CHAR(36)    NOT NULL DEFAULT (UUID()),
  user_id    CHAR(36)    NOT NULL,
  label      VARCHAR(50) DEFAULT 'Home',
  street     TEXT        NOT NULL,
  city       VARCHAR(100) NOT NULL,
  province   VARCHAR(100) NOT NULL,
  zip_code   VARCHAR(10) DEFAULT NULL,
  is_default TINYINT(1)  NOT NULL DEFAULT 0,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               CHAR(36)      NOT NULL DEFAULT (UUID()),
  order_number     VARCHAR(30)   NOT NULL,
  user_id          CHAR(36)      NOT NULL,
  address_id       CHAR(36)      DEFAULT NULL,
  status           ENUM('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  payment_status   ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  payment_method   ENUM('gcash','bank_transfer','credit_card','cash_on_delivery','maya') DEFAULT NULL,
  subtotal         DECIMAL(12,2) NOT NULL,
  discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount     DECIMAL(12,2) NOT NULL,
  notes            TEXT          DEFAULT NULL,
  ordered_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at     DATETIME      DEFAULT NULL,
  delivered_at     DATETIME      DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_ordered_at (ordered_at),
  CONSTRAINT fk_orders_user    FOREIGN KEY (user_id)    REFERENCES users(id),
  CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           CHAR(36)      NOT NULL DEFAULT (UUID()),
  order_id     CHAR(36)      NOT NULL,
  product_id   CHAR(36)      NOT NULL,
  product_name VARCHAR(255)  NOT NULL,
  model_number VARCHAR(100)  NOT NULL,
  quantity     INT           NOT NULL CHECK (quantity > 0),
  unit_price   DECIMAL(12,2) NOT NULL,
  total_price  DECIMAL(12,2) NOT NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order   (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMER ACTIVITY
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_activity (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id    CHAR(36)     DEFAULT NULL,
  session_id VARCHAR(100) DEFAULT NULL,
  event_type VARCHAR(50)  NOT NULL,
  product_id CHAR(36)     DEFAULT NULL,
  metadata   JSON         DEFAULT NULL,
  ip_address VARCHAR(45)  DEFAULT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_user    (user_id),
  KEY idx_activity_event   (event_type),
  KEY idx_activity_created (created_at),
  KEY idx_activity_product (product_id),
  CONSTRAINT fk_activity_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  CONSTRAINT fk_activity_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
