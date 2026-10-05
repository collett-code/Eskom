-- ============================================================
-- ESKOM CONNECT — SCHEMA
-- Paste the whole file into Neon SQL Editor and Run.
-- ============================================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS notification_recipients CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS complaint_status_history CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS electricity_report_history CASCADE;
DROP TABLE IF EXISTS electricity_reports CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE communities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  province TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  phone      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  community_id INTEGER REFERENCES communities(id),
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id    INTEGER REFERENCES roles(id),
  department_id INTEGER REFERENCES departments(id),
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE electricity_reports (
  id SERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  address_line TEXT,
  community_id INTEGER REFERENCES communities(id),
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Submitted',
  assigned_staff_id INTEGER REFERENCES staff(id),
  department_id INTEGER REFERENCES departments(id),
  resolution TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE electricity_report_history (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES electricity_reports(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_staff_id INTEGER REFERENCES staff(id),
  changed_by_customer_id INTEGER REFERENCES customers(id),
  comment TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaints (
  id SERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  community_id INTEGER REFERENCES communities(id),
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Submitted',
  assigned_staff_id INTEGER REFERENCES staff(id),
  department_id INTEGER REFERENCES departments(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaint_status_history (
  id SERIAL PRIMARY KEY,
  complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_staff_id INTEGER REFERENCES staff(id),
  changed_by_customer_id INTEGER REFERENCES customers(id),
  comment TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'Pending',
  assigned_staff_id INTEGER REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'General',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  community_id INTEGER REFERENCES communities(id),
  created_by_staff_id INTEGER REFERENCES staff(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at DATE
);

CREATE TABLE notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,
  recipient_id INTEGER NOT NULL,
  read_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id INTEGER,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_customer    ON electricity_reports(customer_id);
CREATE INDEX idx_reports_status      ON electricity_reports(status);
CREATE INDEX idx_complaints_customer ON complaints(customer_id);
CREATE INDEX idx_complaints_status   ON complaints(status);
CREATE INDEX idx_appts_customer      ON appointments(customer_id);
CREATE INDEX idx_notif_recipient     ON notification_recipients(recipient_type, recipient_id);

-- ---------- seed ----------
INSERT INTO departments (name, description) VALUES
  ('Distribution', 'Network fault repairs'),
  ('Customer Operations', 'Customer-facing support'),
  ('Network Operations', 'Grid operations'),
  ('Revenue Protection', 'Illegal connections and metering'),
  ('Public Lighting', 'Streetlights'),
  ('Safety & Health', 'Hazard reports');

INSERT INTO roles (name, description) VALUES
  ('S', 'Super Administrator'),
  ('A', 'Administrator'),
  ('C', 'Customer Service Rep'),
  ('M', 'Manager');

INSERT INTO communities (name, province) VALUES
  ('Soweto', 'Gauteng'),
  ('Sandton', 'Gauteng'),
  ('Khayelitsha', 'Western Cape'),
  ('Umlazi', 'KwaZulu-Natal'),
  ('Mamelodi', 'Gauteng'),
  ('Tembisa', 'Gauteng');

-- ---------- demo users ----------
-- password hash below = bcrypt('Customer#2026', 10)
INSERT INTO customers (first_name, last_name, email, phone, password_hash, community_id) VALUES
  ('Thandi','Mokoena','thandi.mokoena@mail.co.za','0821234567',
   '$2a$10$REPLACE_WITH_YOUR_CUSTOMER_HASH',
   (SELECT id FROM communities WHERE name='Soweto'));

-- password hash below = bcrypt('Admin#2026', 10)
INSERT INTO staff (first_name, last_name, email, password_hash, role_id, department_id) VALUES
  ('Nomvula','Sithole','nomvula.sithole@eskomconnect.example',
   '$2a$10$REPLACE_WITH_YOUR_STAFF_HASH',
   (SELECT id FROM roles WHERE name='S'), (SELECT id FROM departments WHERE name='Distribution')),
  ('Pieter','Venter','pieter.venter@eskomconnect.example',
   '$2a$10$REPLACE_WITH_YOUR_STAFF_HASH',
   (SELECT id FROM roles WHERE name='A'), (SELECT id FROM departments WHERE name='Customer Operations')),
  ('Lerato','Mabaso','lerato.mabaso@eskomconnect.example',
   '$2a$10$REPLACE_WITH_YOUR_STAFF_HASH',
   (SELECT id FROM roles WHERE name='C'), (SELECT id FROM departments WHERE name='Customer Operations')),
  ('Thabo','Molefe','thabo.molefe@eskomconnect.example',
   '$2a$10$REPLACE_WITH_YOUR_STAFF_HASH',
   (SELECT id FROM roles WHERE name='M'), (SELECT id FROM departments WHERE name='Network Operations'));
