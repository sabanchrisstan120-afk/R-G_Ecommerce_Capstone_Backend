-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 28, 2026 at 05:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rg_trading`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `label` varchar(50) DEFAULT 'Home',
  `street` text NOT NULL,
  `city` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `created_at`) VALUES
(1, 'Window Type', 'window-type', 'Window-mounted air conditioning units', '2026-03-27 08:13:28'),
(2, 'Split Type', 'split-type', 'Split-type air conditioners', '2026-03-27 08:13:28'),
(3, 'Portable', 'portable', 'Portable air conditioners', '2026-03-27 08:13:28'),
(4, 'Cassette Type', 'cassette-type', 'Ceiling cassette air conditioners', '2026-03-27 08:13:28'),
(5, 'Floor Standing', 'floor-standing', 'Floor-standing air conditioners', '2026-03-27 08:13:28');

-- --------------------------------------------------------

--
-- Table structure for table `customer_activity`
--

CREATE TABLE `customer_activity` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `product_id` char(36) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_activity`
--

INSERT INTO `customer_activity` (`id`, `user_id`, `session_id`, `event_type`, `product_id`, `metadata`, `ip_address`, `created_at`) VALUES
('0bafcb57-5aa7-11f1-9b34-047a56434ebe', '62e17334-68a8-4940-9425-289a8c058471', NULL, 'order_placed', NULL, '{\"order_id\":\"482ac802-5e7c-45d9-84f2-35c2c0fcbbb1\",\"total_amount\":30800}', NULL, '2026-05-28 23:08:12'),
('1aa04ab4-5aa7-11f1-9b34-047a56434ebe', '62e17334-68a8-4940-9425-289a8c058471', NULL, 'order_placed', NULL, '{\"order_id\":\"f11726a7-96fa-48e8-8129-b530362eaea4\",\"total_amount\":23400}', NULL, '2026-05-28 23:08:37'),
('3210bc55-5a43-11f1-a06b-13bb7207cef5', 'af9c6e00-a94f-44f5-a34b-700c9c03d6fc', NULL, 'order_placed', NULL, '{\"order_id\":\"2c23b918-3b66-47c8-ae58-c4a4a75a71a1\",\"total_amount\":18150}', NULL, '2026-05-28 11:13:27'),
('d9f89534-5aa6-11f1-9b34-047a56434ebe', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'order_placed', NULL, '{\"order_id\":\"7d628fb9-60cb-45cd-8880-89b09c505ea2\",\"total_amount\":25650}', NULL, '2026-05-28 23:06:49'),
('e85ba7ed-5aa6-11f1-9b34-047a56434ebe', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'order_placed', NULL, '{\"order_id\":\"2404ea47-c038-458a-849c-8e15ec3bbff4\",\"total_amount\":32300}', NULL, '2026-05-28 23:07:13'),
('f05730fb-5aa6-11f1-9b34-047a56434ebe', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'order_placed', NULL, '{\"order_id\":\"5874e4b9-4e4d-49dd-8d23-2bb92c699560\",\"total_amount\":41850}', NULL, '2026-05-28 23:07:26');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `order_number` varchar(30) NOT NULL,
  `user_id` char(36) NOT NULL,
  `address_id` char(36) DEFAULT NULL,
  `status` enum('pending','confirmed','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `payment_method` enum('gcash','bank_transfer','credit_card','cash_on_delivery','maya') DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(12,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `ordered_at` datetime NOT NULL DEFAULT current_timestamp(),
  `confirmed_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `user_id`, `address_id`, `status`, `payment_status`, `payment_method`, `subtotal`, `discount_amount`, `shipping_fee`, `total_amount`, `notes`, `ordered_at`, `confirmed_at`, `delivered_at`, `created_at`, `updated_at`) VALUES
('2404ea47-c038-458a-849c-8e15ec3bbff4', 'RG-20260528-70809', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'delivered', 'paid', 'cash_on_delivery', 32300.00, 0.00, 0.00, 32300.00, 'dawdawdawda', '2026-05-28 23:07:13', NULL, '2026-05-28 23:11:17', '2026-05-28 23:07:13', '2026-05-28 23:11:17'),
('2c23b918-3b66-47c8-ae58-c4a4a75a71a1', 'RG-20260528-90822', 'af9c6e00-a94f-44f5-a34b-700c9c03d6fc', NULL, 'delivered', 'paid', 'cash_on_delivery', 18150.00, 0.00, 0.00, 18150.00, 'cscaaad', '2026-05-28 11:13:27', NULL, '2026-05-28 23:11:28', '2026-05-28 11:13:27', '2026-05-28 23:11:28'),
('482ac802-5e7c-45d9-84f2-35c2c0fcbbb1', 'RG-20260528-47901', '62e17334-68a8-4940-9425-289a8c058471', NULL, 'delivered', 'paid', 'cash_on_delivery', 30800.00, 0.00, 0.00, 30800.00, 'wdawdadawdad', '2026-05-28 23:08:12', NULL, '2026-05-28 23:10:52', '2026-05-28 23:08:12', '2026-05-28 23:10:52'),
('5874e4b9-4e4d-49dd-8d23-2bb92c699560', 'RG-20260528-53929', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'delivered', 'paid', 'cash_on_delivery', 41850.00, 0.00, 0.00, 41850.00, 'adadawdad', '2026-05-28 23:07:26', NULL, '2026-05-28 23:11:12', '2026-05-28 23:07:26', '2026-05-28 23:11:12'),
('7d628fb9-60cb-45cd-8880-89b09c505ea2', 'RG-20260528-27265', '4b0df579-adc8-41a5-9aef-08cdc12ad534', NULL, 'delivered', 'paid', 'cash_on_delivery', 25650.00, 0.00, 0.00, 25650.00, 'dawdawdawd', '2026-05-28 23:06:49', NULL, '2026-05-28 23:11:22', '2026-05-28 23:06:49', '2026-05-28 23:11:22'),
('f11726a7-96fa-48e8-8129-b530362eaea4', 'RG-20260528-32077', '62e17334-68a8-4940-9425-289a8c058471', NULL, 'delivered', 'paid', 'cash_on_delivery', 23400.00, 0.00, 0.00, 23400.00, 'awdadadada', '2026-05-28 23:08:37', NULL, '2026-05-28 23:11:05', '2026-05-28 23:08:37', '2026-05-28 23:11:05');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `order_id` char(36) NOT NULL,
  `product_id` char(36) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `model_number` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL CHECK (`quantity` > 0),
  `unit_price` decimal(12,2) NOT NULL,
  `total_price` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `product_name`, `model_number`, `quantity`, `unit_price`, `total_price`, `created_at`) VALUES
('0bae610b-5aa7-11f1-9b34-047a56434ebe', '482ac802-5e7c-45d9-84f2-35c2c0fcbbb1', '9a9b8696-5aa6-11f1-9b34-047a56434ebe', 'Samsung Window Type Model 52 1.5HP', 'MODEL-SAM-52', 1, 30800.00, 30800.00, '2026-05-28 23:08:12'),
('1a9f8179-5aa7-11f1-9b34-047a56434ebe', 'f11726a7-96fa-48e8-8129-b530362eaea4', '49375f3b-5a40-11f1-a06b-13bb7207cef5', 'Carrier Aircon Model 36 1HP', 'MODEL-CAR-36', 1, 23400.00, 23400.00, '2026-05-28 23:08:37'),
('32105d65-5a43-11f1-a06b-13bb7207cef5', '2c23b918-3b66-47c8-ae58-c4a4a75a71a1', '492fa52e-5a40-11f1-a06b-13bb7207cef5', 'Daikin Aircon Model 1 1HP', 'MODEL-DAI-1', 1, 18150.00, 18150.00, '2026-05-28 11:13:27'),
('d9f7dbaf-5aa6-11f1-9b34-047a56434ebe', '7d628fb9-60cb-45cd-8880-89b09c505ea2', '9a9b5020-5aa6-11f1-9b34-047a56434ebe', 'LG Floor Standing Model 51 1HP', 'MODEL-LG-51', 1, 25650.00, 25650.00, '2026-05-28 23:06:49'),
('e859fe59-5aa6-11f1-9b34-047a56434ebe', '2404ea47-c038-458a-849c-8e15ec3bbff4', '9a9de36d-5aa6-11f1-9b34-047a56434ebe', 'Midea Cassette Type Model 62 1.5HP', 'MODEL-MID-62', 1, 32300.00, 32300.00, '2026-05-28 23:07:13'),
('f056bc0c-5aa6-11f1-9b34-047a56434ebe', '5874e4b9-4e4d-49dd-8d23-2bb92c699560', '9a9d399b-5aa6-11f1-9b34-047a56434ebe', 'Panasonic Floor Standing Model 59 2.5HP', 'MODEL-PAN-59', 1, 41850.00, 41850.00, '2026-05-28 23:07:26');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `category_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `model_number` varchar(100) NOT NULL,
  `brand` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `horsepower` decimal(4,2) DEFAULT NULL,
  `cooling_capacity_btu` int(11) DEFAULT NULL,
  `energy_rating` varchar(20) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `stock_qty` int(11) NOT NULL DEFAULT 0,
  `image_url` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `image_urls` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `category_id`, `name`, `model_number`, `brand`, `description`, `horsepower`, `cooling_capacity_btu`, `energy_rating`, `price`, `stock_qty`, `image_url`, `is_active`, `created_at`, `updated_at`, `images`, `image_urls`) VALUES
('492fa52e-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 1 1HP', 'MODEL-DAI-1', 'Daikin', NULL, 1.00, 9000, '3 Star', 18150.00, 10, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 11:13:27', NULL, NULL),
('492fe1fc-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 2 1.5HP', 'MODEL-MID-2', 'Midea', NULL, 1.50, 12000, '4 Star', 23300.00, 12, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49301baa-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 3 2HP', 'MODEL-LG-3', 'LG', NULL, 2.00, 18000, '5 Star', 28450.00, 13, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493059be-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 4 2.5HP', 'MODEL-SAM-4', 'Samsung', NULL, 2.50, 22000, '2 Star', 33600.00, 14, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4930a227-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 5 0.5HP', 'MODEL-PAN-5', 'Panasonic', NULL, 0.50, 5000, '3 Star', 13750.00, 15, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4930eeb0-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 6 1HP', 'MODEL-CAR-6', 'Carrier', NULL, 1.00, 9000, '4 Star', 18900.00, 16, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493137ad-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 7 1.5HP', 'MODEL-DAI-7', 'Daikin', NULL, 1.50, 12000, '5 Star', 24050.00, 17, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4931921f-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 8 2HP', 'MODEL-MID-8', 'Midea', NULL, 2.00, 18000, '2 Star', 29200.00, 18, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4931ddc4-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 9 2.5HP', 'MODEL-LG-9', 'LG', NULL, 2.50, 22000, '3 Star', 34350.00, 19, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49321665-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 10 0.5HP', 'MODEL-SAM-10', 'Samsung', NULL, 0.50, 5000, '4 Star', 14500.00, 20, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493265e8-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 11 1HP', 'MODEL-PAN-11', 'Panasonic', NULL, 1.00, 9000, '5 Star', 19650.00, 21, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49329ab5-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 12 1.5HP', 'MODEL-CAR-12', 'Carrier', NULL, 1.50, 12000, '2 Star', 24800.00, 22, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4932cd34-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 13 2HP', 'MODEL-DAI-13', 'Daikin', NULL, 2.00, 18000, '3 Star', 29950.00, 23, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4932f9ec-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 14 2.5HP', 'MODEL-MID-14', 'Midea', NULL, 2.50, 22000, '4 Star', 35100.00, 24, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49332561-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 15 0.5HP', 'MODEL-LG-15', 'LG', NULL, 0.50, 5000, '5 Star', 15250.00, 25, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49335100-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 16 1HP', 'MODEL-SAM-16', 'Samsung', NULL, 1.00, 9000, '2 Star', 20400.00, 26, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49338385-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 17 1.5HP', 'MODEL-PAN-17', 'Panasonic', NULL, 1.50, 12000, '3 Star', 25550.00, 27, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4933c24f-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 18 2HP', 'MODEL-CAR-18', 'Carrier', NULL, 2.00, 18000, '4 Star', 30700.00, 28, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493414f8-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 19 2.5HP', 'MODEL-DAI-19', 'Daikin', NULL, 2.50, 22000, '5 Star', 35850.00, 29, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493446ce-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 20 0.5HP', 'MODEL-MID-20', 'Midea', NULL, 0.50, 5000, '2 Star', 16000.00, 30, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493473e1-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 21 1HP', 'MODEL-LG-21', 'LG', NULL, 1.00, 9000, '3 Star', 21150.00, 31, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4934a199-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 22 1.5HP', 'MODEL-SAM-22', 'Samsung', NULL, 1.50, 12000, '4 Star', 26300.00, 32, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4934d17e-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 23 2HP', 'MODEL-PAN-23', 'Panasonic', NULL, 2.00, 18000, '5 Star', 31450.00, 33, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4934ffa8-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 24 2.5HP', 'MODEL-CAR-24', 'Carrier', NULL, 2.50, 22000, '2 Star', 36600.00, 34, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49353559-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 25 0.5HP', 'MODEL-DAI-25', 'Daikin', NULL, 0.50, 5000, '3 Star', 16750.00, 10, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4935630b-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 26 1HP', 'MODEL-MID-26', 'Midea', NULL, 1.00, 9000, '4 Star', 21900.00, 11, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4935937f-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 27 1.5HP', 'MODEL-LG-27', 'LG', NULL, 1.50, 12000, '5 Star', 27050.00, 12, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4935c276-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 28 2HP', 'MODEL-SAM-28', 'Samsung', NULL, 2.00, 18000, '2 Star', 32200.00, 13, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4935f259-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 29 2.5HP', 'MODEL-PAN-29', 'Panasonic', NULL, 2.50, 22000, '3 Star', 37350.00, 14, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49362f6b-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 30 0.5HP', 'MODEL-CAR-30', 'Carrier', NULL, 0.50, 5000, '4 Star', 17500.00, 15, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49366c3a-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 31 1HP', 'MODEL-DAI-31', 'Daikin', NULL, 1.00, 9000, '5 Star', 22650.00, 16, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4936a233-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 32 1.5HP', 'MODEL-MID-32', 'Midea', NULL, 1.50, 12000, '2 Star', 27800.00, 17, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4936cff7-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 33 2HP', 'MODEL-LG-33', 'LG', NULL, 2.00, 18000, '3 Star', 32950.00, 18, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4936fe2f-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 34 2.5HP', 'MODEL-SAM-34', 'Samsung', NULL, 2.50, 22000, '4 Star', 38100.00, 19, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4937310a-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 35 0.5HP', 'MODEL-PAN-35', 'Panasonic', NULL, 0.50, 5000, '5 Star', 18250.00, 20, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49375f3b-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 36 1HP', 'MODEL-CAR-36', 'Carrier', NULL, 1.00, 9000, '2 Star', 23400.00, 20, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 23:08:37', NULL, NULL),
('4937943f-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 37 1.5HP', 'MODEL-DAI-37', 'Daikin', NULL, 1.50, 12000, '3 Star', 28550.00, 22, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4937c713-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 38 2HP', 'MODEL-MID-38', 'Midea', NULL, 2.00, 18000, '4 Star', 33700.00, 23, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4937f8b7-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 39 2.5HP', 'MODEL-LG-39', 'LG', NULL, 2.50, 22000, '5 Star', 38850.00, 24, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49381e11-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 40 0.5HP', 'MODEL-SAM-40', 'Samsung', NULL, 0.50, 5000, '2 Star', 19000.00, 25, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49384d65-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 41 1HP', 'MODEL-PAN-41', 'Panasonic', NULL, 1.00, 9000, '3 Star', 24150.00, 26, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49388147-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 42 1.5HP', 'MODEL-CAR-42', 'Carrier', NULL, 1.50, 12000, '4 Star', 29300.00, 27, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4938c801-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 43 2HP', 'MODEL-DAI-43', 'Daikin', NULL, 2.00, 18000, '5 Star', 34450.00, 28, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4938fa11-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 44 2.5HP', 'MODEL-MID-44', 'Midea', NULL, 2.50, 22000, '2 Star', 39600.00, 29, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('49392918-5a40-11f1-a06b-13bb7207cef5', 1, 'LG Aircon Model 45 0.5HP', 'MODEL-LG-45', 'LG', NULL, 0.50, 5000, '3 Star', 19750.00, 30, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493958fe-5a40-11f1-a06b-13bb7207cef5', 2, 'Samsung Aircon Model 46 1HP', 'MODEL-SAM-46', 'Samsung', NULL, 1.00, 9000, '4 Star', 24900.00, 31, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493987c4-5a40-11f1-a06b-13bb7207cef5', 3, 'Panasonic Aircon Model 47 1.5HP', 'MODEL-PAN-47', 'Panasonic', NULL, 1.50, 12000, '5 Star', 30050.00, 32, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4939b54a-5a40-11f1-a06b-13bb7207cef5', 1, 'Carrier Aircon Model 48 2HP', 'MODEL-CAR-48', 'Carrier', NULL, 2.00, 18000, '2 Star', 35200.00, 33, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('4939e7c8-5a40-11f1-a06b-13bb7207cef5', 2, 'Daikin Aircon Model 49 2.5HP', 'MODEL-DAI-49', 'Daikin', NULL, 2.50, 22000, '3 Star', 40350.00, 34, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('493a2565-5a40-11f1-a06b-13bb7207cef5', 3, 'Midea Aircon Model 50 0.5HP', 'MODEL-MID-50', 'Midea', NULL, 0.50, 5000, '4 Star', 20500.00, 10, NULL, 1, '2026-05-28 10:52:37', '2026-05-28 10:52:37', NULL, NULL),
('9a9b5020-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Floor Standing Model 51 1HP', 'MODEL-LG-51', 'LG', NULL, 1.00, 9000, '5 Star', 25650.00, 10, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:06:49', NULL, NULL),
('9a9b8696-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Window Type Model 52 1.5HP', 'MODEL-SAM-52', 'Samsung', NULL, 1.50, 12000, '2 Star', 30800.00, 11, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:08:12', NULL, NULL),
('9a9bbef1-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Split Type Model 53 2HP', 'MODEL-PAN-53', 'Panasonic', NULL, 2.00, 18000, '3 Star', 35950.00, 13, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9c0619-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Cassette Type Model 54 2.5HP', 'MODEL-CAR-54', 'Carrier', NULL, 2.50, 22000, '4 Star', 41100.00, 14, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9c4b3d-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Floor Standing Model 55 0.5HP', 'MODEL-DAI-55', 'Daikin', NULL, 0.50, 5000, '5 Star', 21250.00, 15, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9c8800-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Window Type Model 56 1HP', 'MODEL-MID-56', 'Midea', NULL, 1.00, 9000, '2 Star', 26400.00, 16, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9cc673-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Split Type Model 57 1.5HP', 'MODEL-LG-57', 'LG', NULL, 1.50, 12000, '3 Star', 31550.00, 17, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9d007e-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Cassette Type Model 58 2HP', 'MODEL-SAM-58', 'Samsung', NULL, 2.00, 18000, '4 Star', 36700.00, 18, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9d399b-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Floor Standing Model 59 2.5HP', 'MODEL-PAN-59', 'Panasonic', NULL, 2.50, 22000, '5 Star', 41850.00, 18, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:07:26', NULL, NULL),
('9a9d7349-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Window Type Model 60 0.5HP', 'MODEL-CAR-60', 'Carrier', NULL, 0.50, 5000, '2 Star', 22000.00, 20, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9dacee-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Split Type Model 61 1HP', 'MODEL-DAI-61', 'Daikin', NULL, 1.00, 9000, '3 Star', 27150.00, 21, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9de36d-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Cassette Type Model 62 1.5HP', 'MODEL-MID-62', 'Midea', NULL, 1.50, 12000, '4 Star', 32300.00, 21, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:07:13', NULL, NULL),
('9a9e2296-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Floor Standing Model 63 2HP', 'MODEL-LG-63', 'LG', NULL, 2.00, 18000, '5 Star', 37450.00, 23, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9e62d5-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Window Type Model 64 2.5HP', 'MODEL-SAM-64', 'Samsung', NULL, 2.50, 22000, '2 Star', 42600.00, 24, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9ea30e-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Split Type Model 65 0.5HP', 'MODEL-PAN-65', 'Panasonic', NULL, 0.50, 5000, '3 Star', 22750.00, 25, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9ee464-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Cassette Type Model 66 1HP', 'MODEL-CAR-66', 'Carrier', NULL, 1.00, 9000, '4 Star', 27900.00, 26, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9f256c-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Floor Standing Model 67 1.5HP', 'MODEL-DAI-67', 'Daikin', NULL, 1.50, 12000, '5 Star', 33050.00, 27, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9f6669-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Window Type Model 68 2HP', 'MODEL-MID-68', 'Midea', NULL, 2.00, 18000, '2 Star', 38200.00, 28, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9f9dec-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Split Type Model 69 2.5HP', 'MODEL-LG-69', 'LG', NULL, 2.50, 22000, '3 Star', 43350.00, 29, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9a9fd417-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Cassette Type Model 70 0.5HP', 'MODEL-SAM-70', 'Samsung', NULL, 0.50, 5000, '4 Star', 23500.00, 30, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa00d39-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Floor Standing Model 71 1HP', 'MODEL-PAN-71', 'Panasonic', NULL, 1.00, 9000, '5 Star', 28650.00, 31, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa04e50-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Window Type Model 72 1.5HP', 'MODEL-CAR-72', 'Carrier', NULL, 1.50, 12000, '2 Star', 33800.00, 32, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa08850-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Split Type Model 73 2HP', 'MODEL-DAI-73', 'Daikin', NULL, 2.00, 18000, '3 Star', 38950.00, 33, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa0bf32-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Cassette Type Model 74 2.5HP', 'MODEL-MID-74', 'Midea', NULL, 2.50, 22000, '4 Star', 44100.00, 34, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa0fc08-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Floor Standing Model 75 0.5HP', 'MODEL-LG-75', 'LG', NULL, 0.50, 5000, '5 Star', 24250.00, 10, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa13905-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Window Type Model 76 1HP', 'MODEL-SAM-76', 'Samsung', NULL, 1.00, 9000, '2 Star', 29400.00, 11, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa17640-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Split Type Model 77 1.5HP', 'MODEL-PAN-77', 'Panasonic', NULL, 1.50, 12000, '3 Star', 34550.00, 12, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa1af00-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Cassette Type Model 78 2HP', 'MODEL-CAR-78', 'Carrier', NULL, 2.00, 18000, '4 Star', 39700.00, 13, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa1ee55-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Floor Standing Model 79 2.5HP', 'MODEL-DAI-79', 'Daikin', NULL, 2.50, 22000, '5 Star', 44850.00, 14, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa22562-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Window Type Model 80 0.5HP', 'MODEL-MID-80', 'Midea', NULL, 0.50, 5000, '2 Star', 25000.00, 15, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa25d1c-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Split Type Model 81 1HP', 'MODEL-LG-81', 'LG', NULL, 1.00, 9000, '3 Star', 30150.00, 16, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa296d9-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Cassette Type Model 82 1.5HP', 'MODEL-SAM-82', 'Samsung', NULL, 1.50, 12000, '4 Star', 35300.00, 17, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa2cff5-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Floor Standing Model 83 2HP', 'MODEL-PAN-83', 'Panasonic', NULL, 2.00, 18000, '5 Star', 40450.00, 18, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa30779-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Window Type Model 84 2.5HP', 'MODEL-CAR-84', 'Carrier', NULL, 2.50, 22000, '2 Star', 45600.00, 19, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa3488c-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Split Type Model 85 0.5HP', 'MODEL-DAI-85', 'Daikin', NULL, 0.50, 5000, '3 Star', 25750.00, 20, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa3aa9d-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Cassette Type Model 86 1HP', 'MODEL-MID-86', 'Midea', NULL, 1.00, 9000, '4 Star', 30900.00, 21, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa3f45d-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Floor Standing Model 87 1.5HP', 'MODEL-LG-87', 'LG', NULL, 1.50, 12000, '5 Star', 36050.00, 22, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa42ce3-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Window Type Model 88 2HP', 'MODEL-SAM-88', 'Samsung', NULL, 2.00, 18000, '2 Star', 41200.00, 23, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa46424-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Split Type Model 89 2.5HP', 'MODEL-PAN-89', 'Panasonic', NULL, 2.50, 22000, '3 Star', 46350.00, 24, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa4a513-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Cassette Type Model 90 0.5HP', 'MODEL-CAR-90', 'Carrier', NULL, 0.50, 5000, '4 Star', 26500.00, 25, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa4ddad-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Floor Standing Model 91 1HP', 'MODEL-DAI-91', 'Daikin', NULL, 1.00, 9000, '5 Star', 31650.00, 26, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa51478-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Window Type Model 92 1.5HP', 'MODEL-MID-92', 'Midea', NULL, 1.50, 12000, '2 Star', 36800.00, 27, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa54a40-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Split Type Model 93 2HP', 'MODEL-LG-93', 'LG', NULL, 2.00, 18000, '3 Star', 41950.00, 28, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa586e9-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Cassette Type Model 94 2.5HP', 'MODEL-SAM-94', 'Samsung', NULL, 2.50, 22000, '4 Star', 47100.00, 29, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa5c484-5aa6-11f1-9b34-047a56434ebe', 3, 'Panasonic Floor Standing Model 95 0.5HP', 'MODEL-PAN-95', 'Panasonic', NULL, 0.50, 5000, '5 Star', 27250.00, 30, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa60837-5aa6-11f1-9b34-047a56434ebe', 1, 'Carrier Window Type Model 96 1HP', 'MODEL-CAR-96', 'Carrier', NULL, 1.00, 9000, '2 Star', 32400.00, 31, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa64a84-5aa6-11f1-9b34-047a56434ebe', 2, 'Daikin Split Type Model 97 1.5HP', 'MODEL-DAI-97', 'Daikin', NULL, 1.50, 12000, '3 Star', 37550.00, 32, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa68195-5aa6-11f1-9b34-047a56434ebe', 3, 'Midea Cassette Type Model 98 2HP', 'MODEL-MID-98', 'Midea', NULL, 2.00, 18000, '4 Star', 42700.00, 33, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa702c7-5aa6-11f1-9b34-047a56434ebe', 1, 'LG Floor Standing Model 99 2.5HP', 'MODEL-LG-99', 'LG', NULL, 2.50, 22000, '5 Star', 47850.00, 34, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('9aa73c50-5aa6-11f1-9b34-047a56434ebe', 2, 'Samsung Window Type Model 100 0.5HP', 'MODEL-SAM-100', 'Samsung', NULL, 0.50, 5000, '2 Star', 28000.00, 10, NULL, 1, '2026-05-28 23:05:03', '2026-05-28 23:05:03', NULL, NULL),
('d7f19944-5a3f-11f1-a06b-13bb7207cef5', 1, 'Carrier Optima Window Type 0.5HP', 'WCARZ006EE', 'Carrier', NULL, 0.50, 5000, '2.5 Star', 9500.00, 30, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f1d4de-5a3f-11f1-a06b-13bb7207cef5', 1, 'Carrier Optima Window Type 1.0HP', 'WCARZ010EC', 'Carrier', NULL, 1.00, 9000, '3 Star', 13500.00, 25, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f23a58-5a3f-11f1-a06b-13bb7207cef5', 2, 'Daikin Inverter Split 1.0HP', 'FTKC25UV', 'Daikin', NULL, 1.00, 9000, '5 Star', 35000.00, 15, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f26e50-5a3f-11f1-a06b-13bb7207cef5', 2, 'Daikin Inverter Split 1.5HP', 'FTKC35UV', 'Daikin', NULL, 1.50, 12000, '5 Star', 42000.00, 12, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f2c587-5a3f-11f1-a06b-13bb7207cef5', 2, 'Midea MSplit 1.0HP Inverter', 'MSAG-09NXD', 'Midea', NULL, 1.00, 9000, '4 Star', 28000.00, 20, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f31b30-5a3f-11f1-a06b-13bb7207cef5', 2, 'Midea MSplit 1.5HP Inverter', 'MSAG-12NXD', 'Midea', NULL, 1.50, 12000, '4 Star', 33000.00, 18, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f368c7-5a3f-11f1-a06b-13bb7207cef5', 3, 'LG Portable 1.0HP', 'LP1019WSR', 'LG', NULL, 1.00, 10000, '3 Star', 22000.00, 10, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL),
('d7f3beb9-5a3f-11f1-a06b-13bb7207cef5', 2, 'Samsung Wind-Free 2.0HP', 'AR18TXFCAWK', 'Samsung', NULL, 2.00, 18000, '5 Star', 55000.00, 8, NULL, 1, '2026-05-28 10:49:27', '2026-05-28 10:49:27', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE `product_reviews` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `user_id` char(36) NOT NULL,
  `token` text NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `product_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL DEFAULT uuid(),
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('customer','admin','superadmin') NOT NULL DEFAULT 'customer',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `role`, `is_active`, `email_verified`, `last_login_at`, `created_at`, `updated_at`) VALUES
('4b0df579-adc8-41a5-9aef-08cdc12ad534', 'saban@rgtrading.com', '$2a$12$XyYaiwRAc/SQGi1fnlu2m.ms5eRWVMvlrVZBPjeEtmO4Td9fkZ6ee', 'saban', 'chriistan', NULL, 'customer', 1, 0, NULL, '2026-05-28 23:06:37', '2026-05-28 23:06:37'),
('62e17334-68a8-4940-9425-289a8c058471', 'dog@rgtrading.com', '$2a$12$Buy0FrfuN0CI5cRNFClaWuqjVMzm9CMRZohZpz6Iox4YokNkQ7ie6', 'dog', 'cat', NULL, 'customer', 1, 0, NULL, '2026-05-28 23:07:55', '2026-05-28 23:07:55'),
('af9c6e00-a94f-44f5-a34b-700c9c03d6fc', 'juan@rgtrading.com', '$2a$12$tdrJKg6tSrlIq0bvzzJGGOpKSOiQ7bt2kOxrbi4QikDRUhDAbB31O', 'juan', 'example', NULL, 'customer', 1, 0, NULL, '2026-05-28 11:12:42', '2026-05-28 12:10:16'),
('d2696b77-5aa5-11f1-9b34-047a56434ebe', 'admin@rgtrading.com', '$2a$12$ewiPRttDg8ozirZOaa28w.uCt81fCgijlHFfoq0WdpW5qbCGI/mYe', 'Admin', 'RG', NULL, 'admin', 1, 0, '2026-05-28 23:10:39', '2026-05-28 22:59:27', '2026-05-28 23:10:39');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_addresses_user` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categories_slug` (`slug`);

--
-- Indexes for table `customer_activity`
--
ALTER TABLE `customer_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_activity_user` (`user_id`),
  ADD KEY `idx_activity_event` (`event_type`),
  ADD KEY `idx_activity_created` (`created_at`),
  ADD KEY `idx_activity_product` (`product_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_orders_number` (`order_number`),
  ADD KEY `idx_orders_user` (`user_id`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_ordered_at` (`ordered_at`),
  ADD KEY `fk_orders_address` (`address_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order` (`order_id`),
  ADD KEY `idx_order_items_product` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_products_model` (`model_number`),
  ADD KEY `idx_products_category` (`category_id`),
  ADD KEY `idx_products_brand` (`brand`),
  ADD KEY `idx_products_active` (`is_active`);

--
-- Indexes for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_refresh_user` (`user_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `idx_users_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_activity`
--
ALTER TABLE `customer_activity`
  ADD CONSTRAINT `fk_activity_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_oi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
  ADD CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_review_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_review_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
