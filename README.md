🏡 ZenLand – Hệ thống bán đất cá nhân
🎯 Mục tiêu

Xây dựng 1 landing page cho từng lô đất + CMS quản lý nội bộ + tracking để chạy ads.

Không phải web đăng tin kiểu chợ. 👉 Đây là tool bán hàng cá nhân tối ưu chuyển đổi.

🧠 Kiến trúc tổng

1. Frontend
   React (Vite)
   Component-based
   Không multi-category (focus LAND)
2. Backend
   Supabase
   Database: properties
   Storage: raw-assets
3. Tracking
   GA4 (page_view, view_item, click_call, click_zalo)
   FB Pixel (ViewContent, Contact)
   🗄️ Database Schema (Supabase)

Table: properties

public_data jsonb
private_data jsonb
status text
updated_at timestamp
created_at timestamp default now()
slug text (unique)
public_data

Dữ liệu hiển thị ra ngoài:

{
"headline": "...",
"price": 13000000000,
"area": 1000,
"gallery": [
"url1",
"url2"
],
"legal": "...",
"potential": "...",
"map": "..."
}
private_data

Dữ liệu nội bộ:

{
"ownerName": "...",
"phone": "...",
"commission": "...",
"notes": "...",
"statusLogs": []
}
🧰 Storage
Bucket: raw-assets

👉 Dùng cho cả:

ảnh raw
ảnh public
video

❗ Không dùng bucket assets nữa (tránh duplicate upload)

🖼️ RAW LIBRARY (Admin)
Tính năng
Load file từ Supabase storage
Search theo tên
Filter:
All
Image
Video
Multi select (click + drag)
Sort theo thời gian
Preview full (image/video)
UX
giống Facebook / Google Photos
chọn nhiều ảnh nhanh
không upload lại
Output
public_data.gallery = [url1, url2, ...]
🧱 LandPage (Public)
Sections
Hero
Why buy now
Core info
Proof (sổ, quy hoạch)
Price comparison
Potential
Map
Final CTA
📊 Tracking
Events
Event Mô tả
page_view mở trang
view_item xem lô đất
click_call bấm gọi
click_zalo bấm zalo
FB Pixel
ViewContent
Contact
⚡ Performance
Image resize → WebP (~1200px)
Lazy load ảnh
Cache slug (TTL 5 phút)
Invalidate cache sau khi save
🛠️ Admin CMS
Public editor
chỉnh toàn bộ nội dung hiển thị
Private panel
thông tin chủ
ghi chú
log môi giới
Actions
Lưu nháp (draft)
Xuất bản (published)
🚨 Các vấn đề cần lưu ý

1. Cache
   Admin sửa → phải invalidate cache
2. Storage
   Upload xong nhưng chưa save DB → file rác
3. Tracking
   React StrictMode có thể double fire
   🚀 Deploy
4. Push GitHub
   git add .
   git commit -m "update"
   git push origin main
5. Deploy Vercel
   Import project
   Framework: Vite
   Deploy
   🧪 Test checklist
   Tracking
   mở trang → có page_view
   click call → có event
   Upload
   upload ảnh → thành công
   chọn từ library → không upload lại
   Cache
   sửa admin → reload thấy ngay
   🧭 Roadmap
   Phase 1 ✅
   Landing page
   Phase 2 ✅
   Admin CMS
   Phase 3 (next)
   Dashboard quản lý nhiều lô
   Phase 4
   Public listing (/lands)
   Phase 5
   Ads optimization + chatbot
   💣 Triết lý hệ thống
   1 lô đất = 1 trang chốt sale
   Không làm web đăng tin
   Làm tool bán hàng
   🔥 Ghi chú cuối

Hệ này đã đủ để:

chạy ads
test thị trường
chốt deal

Phần quan trọng từ giờ: 👉 content + target + deal
