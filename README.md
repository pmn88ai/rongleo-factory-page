# 🚀 RongLeo System — Dynamic Sales Platform + Analytics

---

## 🎯 Tổng quan

Đây là hệ thống **quản lý + tạo landing + tracking hành vi khách** cho:

* 🏡 Bất động sản
* 🚗 Xe
* 📱 Điện thoại
* 💻 Máy tính
* … bất kỳ tài sản nào

---

## 🧠 Kiến trúc

```text
Frontend (React + Vite)
   ├── /dashboard      → quản lý
   ├── /admin          → tạo / sửa
   ├── /land/:slug     → trang bán (public)
   ├── /analytics      → thống kê
   ├── /config         → cấu hình
   └── /theme-editor   → giao diện

          ↓

Supabase
   ├── DB (properties, schemas, events)
   └── Storage (assets, raw-assets)
```

---

## 🔥 Nguyên tắc hệ thống

* Supabase = **nguồn dữ liệu duy nhất**
* slug = **khóa duy nhất**
* UPSERT → **không trùng dữ liệu**
* Schema-driven → **không cần sửa code khi thêm loại mới**

---

## 📦 Cấu trúc dữ liệu

### 🧾 properties

```sql
id
slug (unique)
category
title
price
data (jsonb)   ← dữ liệu hiển thị
raw (jsonb)    ← dữ liệu nội bộ
created_at
```

---

### 🧠 schemas

```sql
category
fields (jsonb)
```

---

### 📊 events (tracking)

```sql
type
payload (jsonb)
created_at
```

---

## 🔁 Sync đa thiết bị

* Tất cả thiết bị đọc/ghi từ Supabase
* Không localStorage cho data chính
* Dùng:

```text
UPSERT (on_conflict=slug)
```

---

## 🧾 Flow sử dụng

### ➕ Tạo tài sản

1. vào `/admin`
2. chọn category
3. nhập thông tin (dynamic)
4. nhập RAW (nội bộ)
5. upload ảnh
6. Save

---

### 📊 Quản lý

* `/dashboard`
* filter theo category
* xem owner / trạng thái

---

### 🌐 Trang bán

```text
/land/:slug
```

---

## 🎨 Dynamic system

* Mỗi category có schema riêng
* Thêm category = insert DB
* Không cần sửa code

---

## 🖼 Ảnh

| loại   | bucket     |
| ------ | ---------- |
| public | assets     |
| nội bộ | raw-assets |

---

## 📊 Analytics

### 🔥 Tracking 2 lớp

| loại             | chức năng |
| ---------------- | --------- |
| Google Analytics | traffic   |
| Supabase events  | hành vi   |

---

### 🎯 Event tracking

* view_item
* click_call
* click_zalo
* click_doc

---

### 📈 Dashboard

* tổng view
* tổng click
* top sản phẩm
* theo category
* timeline

---

## ⚙️ Cấu hình

Vào `/config` nhập:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
GA_MEASUREMENT_ID
```

---

## 🧪 Chạy local

```bash
npm install
npm run dev
```

---

## 🔐 Truy cập

| route       | mô tả    |
| ----------- | -------- |
| /dashboard  | quản lý  |
| /admin      | tạo/sửa  |
| /analytics  | thống kê |
| /land/:slug | public   |

Password:

```text
RongLeo1234!
```

---

# 🚀 DEPLOY

---

## 1. Push GitHub

```bash
git add .
git commit -m "production ready"
git push
```

---

## 2. Deploy Vercel

1. vào https://vercel.com
2. import repo
3. deploy

---

## 3. Sau deploy

👉 mở:

```text
https://your-domain.vercel.app/config
```

👉 nhập lại:

* SUPABASE_URL
* ANON_KEY
* GA ID

---

# 🧠 SUPABASE SETUP

---

## 1. Tạo bảng

👉 vào SQL Editor → chạy:

```sql
-- properties
alter table properties
add column if not exists category text,
add column if not exists data jsonb,
add column if not exists raw jsonb;

-- schemas
create table if not exists schemas (
  id uuid default gen_random_uuid() primary key,
  category text unique,
  fields jsonb,
  created_at timestamp default now()
);

-- events
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  type text,
  payload jsonb,
  created_at timestamp default now()
);
```

---

## 2. Seed schema

```sql
insert into schemas (category, fields) values
('land', '[{"key":"area","label":"Diện tích","type":"number"}]'),
('car', '[{"key":"brand","label":"Hãng","type":"text"}]'),
('phone', '[{"key":"model","label":"Model","type":"text"}]');
```

---

## 3. Index + cleanup (quan trọng)

```sql
create index if not exists events_created_at_idx
on events (created_at desc);

delete from events
where created_at < now() - interval '90 days';
```

---

# ⚠️ Lưu ý

* ANON KEY là public
* chưa bật RLS → chưa secure tuyệt đối
* system designed cho 1 user

---

# 💰 Triết lý

> Không build web
> Mà build hệ thống bán hàng

---

# 🔥 Trạng thái hiện tại

* ✔ Dynamic multi-category
* ✔ Sync đa thiết bị
* ✔ Tracking đầy đủ
* ✔ Analytics dashboard
* ✔ Deploy production

---

# 🧠 Kết luận

👉 Đây không phải landing page.

👉 Đây là:

> 🔥 **Sales System + Data System + Tracking System**

---
