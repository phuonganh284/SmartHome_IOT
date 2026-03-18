-- ======================================
-- Smart Home IoT Database Schema
-- Database: PostgreSQL (Supabase)
-- ======================================

create extension if not exists "pgcrypto";


-- TABLE: users
-- Lưu thông tin tài khoản người dùng (email và tên)
create table users (
    id uuid primary key,
    email varchar(255) unique not null,
    name varchar(255) not null,
    created_at timestamp default now()
);

-- DEVICE TYPES
create table device_types (
    type varchar primary key,     
    display_name varchar,        
    base_type varchar,
    image text
);

-- DEVICES
create table devices (
    id bigint generated always as identity primary key,
    user_id uuid references users(id) on delete cascade,
    name varchar(255),
    type varchar(100), 
    status int default 0 (status IN (0,1)),
    adafruit_key varchar(255),
    image text,
    created_at timestamp default now()
);

-- LIGHTS
create table lights (
    device_id bigint primary key references devices(id) on delete cascade,
    intensity int check (intensity between 0 and 100),
    color varchar(20)
);

-- FANS
create table fans (
    device_id bigint primary key references devices(id) on delete cascade,
    speed_level int check (speed_level between 0 and 100),
    mode text default 'auto' --"low", "medium", "high", "auto"

);

-- SENSORS
create table sensors (
    id bigint generated always as identity primary key,
    sensor_type varchar(100) unique not null,
    name varchar(255),
    adafruit_key varchar(255),
    created_at timestamp default now()
);

-- SENSOR READINGS
create table sensor_readings (
    id bigserial primary key,
    sensor_id bigint references sensors(id) on delete cascade,
    value float,
    created_at timestamp default now()
);

-- DEVICE ACTIONS
create table device_actions (
    id bigserial primary key,
    device_id bigint references devices(id) on delete cascade,
    action varchar(100),
    value varchar(100),
    created_at timestamp default now()
);

-- AUTOMATION RULES
create table automation_rules (
    id bigint generated always as identity primary key,
    user_id uuid references users(id) on delete cascade,
    sensor_id bigint references sensors(id),
    target_device_id bigint references devices(id),
    condition varchar(20),
    threshold float,
    action varchar(100),
    created_at timestamp default now()
);

-- TRIGGER/PROCEDURE
create function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name'
  );
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

