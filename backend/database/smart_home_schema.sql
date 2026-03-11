-- ======================================
-- Smart Home IoT Database Schema
-- Database: PostgreSQL (Supabase)
-- ======================================

create extension if not exists "pgcrypto";


-- TABLE: users
-- Lưu thông tin tài khoản người dùng (email và tên)
create table users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) unique not null,
    name varchar(255) not null,
    created_at timestamp default now()
);


-- TABLE: devices
-- Lưu các thiết bị trong nhà (đèn, quạt, cảm biến...) thuộc về user
create table devices (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    name varchar(255),
    type varchar(100),
    status varchar(50) default 'off', -- Current state: 'on', 'off'
    adafruit_key varchar(255),
    image text,
    created_at timestamp default now()
);


-- TABLE: sensors
-- Mỗi device có thể có nhiều cảm biến (nhiệt độ, độ ẩm, ánh sáng...)
create table sensors (
    id uuid primary key default gen_random_uuid(),
    device_id uuid references devices(id) on delete cascade,
    name varchar(255),
    sensor_type varchar(100), -- 'temperature', 'light'
    adafruit_key varchar(255),
    created_at timestamp default now()
);

-- TABLE: sensor_readings
-- Lưu dữ liệu đo từ cảm biến theo thời gian (ví dụ mỗi 5 phút)
create table sensor_readings (
    id bigserial primary key,
    sensor_id uuid references sensors(id) on delete cascade,
    value float,
    created_at timestamp default now()
);


-- TABLE: device_actions
-- Lưu lịch sử hoạt động của thiết bị (bật/tắt, thay đổi trạng thái...)
create table device_actions (
    id bigserial primary key,
    device_id uuid references devices(id) on delete cascade,
    action varchar(100),
    value varchar(100),
    created_at timestamp default now()
);


-- TABLE: automation_rules
-- Lưu các rule tự động điều khiển thiết bị dựa trên dữ liệu cảm biến
create table automation_rules (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade,
    sensor_id uuid references sensors(id),
    target_device_id uuid references devices(id),
    condition varchar(20),
    threshold float,
    action varchar(100),
    created_at timestamp default now()
);