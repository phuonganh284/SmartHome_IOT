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

---------------------------------------- 1. OUT DEVICES -----------------------------------------------

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
    status int default 0 check (status in (0, 1)),
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
    speed_level int check (speed_level between 0 and 5),
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

create index idx_sensor_readings_sensor_time 
on sensor_readings(sensor_id, created_at desc);

-- DEVICE ACTIONS
create table device_actions (
    id bigserial primary key,
    device_id bigint references devices(id) on delete cascade,
    action varchar(100),
    value varchar(100),
    created_at timestamp default now()
);


---------------------------------------- 2. AUTOMATION -----------------------------------------------

-- AUTOMATION RULES
create table automation_rules (
    id bigint generated always as identity primary key,
    user_id uuid references users(id) on delete cascade,
    name varchar(255),
    is_active boolean default true,
    is_ai boolean default false,
    last_executed timestamp,
    created_at timestamp default now()
);


-- RULE -> DEVICES (MANY-TO-MANY)
create table rule_devices (
    rule_id bigint references automation_rules(id) on delete cascade,
    device_id bigint references devices(id) on delete cascade,
    primary key (rule_id, device_id)
);


-- RULE CONDITIONS
create table rule_conditions (
    id bigint generated always as identity primary key,
    rule_id bigint references automation_rules(id) on delete cascade,
    sensor_type varchar(100),   -- "temperature", "humidity"
    operator varchar(5),        -- ">", "<", "="
    value float
);


-- RULE ACTIONS
create table rule_actions (
    id bigint generated always as identity primary key,
    rule_id bigint references automation_rules(id) on delete cascade,
    action varchar(50),   -- "turn_on", "turn_off"
    value varchar(50)     -- optional (speed, intensity, etc.)
);


-- RULE SCHEDULES
create table rule_schedules (
    id bigint generated always as identity primary key,
    rule_id bigint references automation_rules(id) on delete cascade,
    start_time time,
    end_time time,
    start_date date,
    end_date date
);


---------------------------------------- 3. NOTIFICATIONS -----------------------------------------------

-- NOTIFICATIONS (for automation rule executions)
create table notifications (
    id bigint generated always as identity primary key,
    user_id uuid references users(id) on delete cascade,
    rule_id bigint references automation_rules(id) on delete cascade,
    device_id bigint references devices(id) on delete cascade,
    message varchar(255),
    action varchar(50),   -- "turn_on", "turn_off"
    read boolean default false,
    created_at timestamp default now()
);

create index idx_notifications_user_created 
on notifications(user_id, created_at desc);

create index idx_notifications_device_created 
on notifications(device_id, created_at desc);



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

