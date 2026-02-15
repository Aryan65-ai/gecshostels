-- MySQL database and user creation script
-- Usage:
--   mysql -u root -p < 01_create_db_and_user.sql

-- Adjust these before running in production
SET @db_name := 'hostel_db';
SET @db_user := 'hostel_user';
SET @db_pass := 'change_me_password'; -- CHANGE THIS

-- Create database with sane defaults
SET @sql := CONCAT('CREATE DATABASE IF NOT EXISTS `', @db_name, '` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Create user (idempotent for MySQL 8.0+)
SET @sql := CONCAT('CREATE USER IF NOT EXISTS `', @db_user, '`@`%` IDENTIFIED BY \'' , @db_pass , '\';');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Grant privileges
SET @sql := CONCAT('GRANT ALL PRIVILEGES ON `', @db_name, '`.* TO `', @db_user, '`@`%`;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

FLUSH PRIVILEGES;

-- Optional: verify
-- SHOW GRANTS FOR `hostel_user`@`%`;


