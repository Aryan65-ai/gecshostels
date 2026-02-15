-- Create default admin user
-- Password is 'admin123' (bcrypt hash with 10 rounds)
-- Generated via: require('bcryptjs').hashSync('admin123', 10)
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('System Administrator', 'admin@gec.ac.in', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE role='admin', password_hash='$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
