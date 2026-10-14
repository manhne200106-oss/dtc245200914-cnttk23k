# Hệ Thống Quản Lý Dự Án (Project Management System)

> Bài tập môn: **Triển khai và Quản trị Hệ thống Phần mềm**
> Đề tài 14: **Hệ thống Quản lý Dự án (Project Management)**
> **Phase 4 (P4)**: Nginx Reverse Proxy + Security Headers (Mốc Commit 1)

---

## 1. Giới thiệu

Hệ thống Quản lý Dự án là ứng dụng web cho phép doanh nghiệp và đội ngũ phát triển theo dõi tiến độ các dự án phần mềm, quản lý thành viên, phân công công việc (tasks), và thảo luận trao đổi thông qua bình luận (comments).

Trong Phase 4 (P4), hệ thống được trang bị **Nginx Reverse Proxy** đóng vai trò cổng vào (Gateway) tập trung cho toàn bộ lưu lượng truy cập Web Application, kèm theo hệ thống **Security Headers** bảo mật lớp ứng dụng.

---

## 2. Công nghệ sử dụng (Tech Stack)

- **Reverse Proxy**: Nginx 1.27 (Alpine)
- **Backend**: Node.js (v20 LTS), Express.js
- **Frontend / Template Engine**: EJS (Embedded JavaScript), Semantic HTML5, CSS3, Vanilla JavaScript
- **Database**: PostgreSQL 16 (Alpine)
- **Database Administration**: pgAdmin 4 (`dpage/pgadmin4:latest`)
- **Database Client**: `node-postgres` (`pg` Connection Pool với 100% parameterized queries)
- **Bảo mật mật khẩu**: `bcryptjs`
- **Containerization & Orchestration**: Docker, Docker Compose (v2/v5)

---

## 3. Kiến trúc hệ thống & Mạng (Architecture & Networking)

```text
                        [ Client / Browser ]
                          │              │
         HTTP (:8081)     │              │ (:5050)
         ┌────────────────┘              └───────────────┐
         ▼                                               ▼
   ┌───────────┐                                   ┌───────────┐
   │ pm-nginx  │ (Reverse Proxy)                   │pm-pgadmin │
   └─────┬─────┘                                   └─────┬─────┘
         │                                               │
         │  http://app:3000                              │
         ▼                                               │
   ┌───────────┐                                         │
   │  pm-app   │ (Node.js/Express)                       │
   └─────┬─────┘                                         │
         │                                               │
         │         pm_network (Docker Bridge)            │
         │         PostgreSQL host: 'postgres:5432'      │
         └───────────────────────┬───────────────────────┘
                                 ▼
                      ┌─────────────────────┐
                      │     pm-postgres     │
                      └──────────┬──────────┘
                                 │
                         [pm_postgres_data] (Persistent Volume)
```

- **Mạng nội bộ (`pm_network`)**:
  - `pm-nginx` kết nối tới `pm-app` thông qua Docker DNS upstream `http://app:3000`.
  - `pm-app` kết nối tới `pm-postgres` qua hostname `postgres:5432`.
  - `pm-pgadmin` kết nối tới `pm-postgres` qua hostname `postgres:5432`.
  - Không hardcode IP container; tự động điều hướng qua DNS nội bộ của Docker.

---

## 4. Danh sách Dịch vụ, Ports và Persistent Volumes

| Dịch vụ (Service) | Container Name | Image | Host Port | Container Port | Mục đích |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reverse Proxy** | `pm-nginx` | `nginx:1.27-alpine` | `8081` | `80` | Reverse Proxy + Security Headers cho Web App |
| **Web App** | `pm-app` | `project-management-app` | `3000` | `3000` | Node.js Express Application (giữ port để debug) |
| **PostgreSQL** | `pm-postgres` | `postgres:16-alpine` | `5432` | `5432` | Cơ sở dữ liệu chính (volume: `pm_postgres_data`) |
| **pgAdmin 4** | `pm-pgadmin` | `dpage/pgadmin4:latest` | `5050` | `80` | Giao diện quản trị DB (volume: `pm_pgadmin_data`) |

> *Ghi chú về Port*: Port `8081` được lựa chọn làm cổng mặc định cho Nginx vì trên môi trường host, cổng `8080` đang được sử dụng bởi dịch vụ khác (`wordpress`). Có thể tùy chỉnh linh hoạt thông qua biến `NGINX_PORT` trong file `.env`.

---

## 5. Cấu hình Nginx & Security Headers

File cấu hình Nginx đặt tại [nginx/nginx.conf](file:///home/manh/projects/project-management/nginx/nginx.conf) được mount ở chế độ read-only (`:ro`):

### Các Security Headers được áp dụng:
1. **`X-Content-Type-Options: nosniff`**: Ngăn chặn trình duyệt tự ý đoán định (MIME sniffing) kiểu nội dung ngoài MIME-type được khai báo.
2. **`X-Frame-Options: SAMEORIGIN`**: Ngăn ngừa tấn công Clickjacking bằng cách chỉ cho phép nhúng frame từ cùng nguồn gốc.
3. **`Referrer-Policy: strict-origin-when-cross-origin`**: Bảo vệ thông tin nhạy cảm trên đường dẫn URL khi chuyển hướng ra ngoài site.
4. **`X-XSS-Protection: 1; mode=block`**: Kích hoạt bộ lọc XSS tích hợp sẵn trên các trình duyệt truyền thống.
5. **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Vô hiệu hóa các API phần cứng không sử dụng trong ứng dụng (camera, mic, vị trí địa lý).
6. **`Content-Security-Policy (CSP)`**: Giới hạn nguồn tài nguyên tin cậy thực thi trên trang (`default-src 'self' script-src 'self' 'unsafe-inline' style-src 'self' 'unsafe-inline' img-src 'self' data: font-src 'self' connect-src 'self'`).
7. **`server_tokens off`**: Ẩn phiên bản Nginx trong header phản hồi nhằm giảm bề mặt thu thập thông tin của kẻ tấn công.

### Proxy Headers chuyển tiếp:
- `Host $host`
- `X-Real-IP $remote_addr`
- `X-Forwarded-For $proxy_add_x_forwarded_for`
- `X-Forwarded-Proto $scheme`
- `X-Forwarded-Host $host`
- `X-Forwarded-Port $server_port`

---

## 6. Hướng dẫn khởi động & Sử dụng

### 6.1. Khởi động hệ thống
```bash
# 1. Khởi tạo biến môi trường nếu chưa có
cp .env.example .env

# 2. Kiểm tra tính toàn vẹn cú pháp compose
docker compose config

# 3. Khởi chạy toàn bộ stack ngầm
docker compose up -d

# 4. Kiểm tra trạng thái các container
docker compose ps
```

### 6.2. Địa chỉ truy cập ứng dụng
- **Web Application (qua Nginx Reverse Proxy)**: [http://localhost:8081](http://localhost:8081)
- **Kiểm tra Healthcheck qua Nginx**: [http://localhost:8081/health](http://localhost:8081/health)
- **pgAdmin 4 (Quản trị DB)**: [http://localhost:5050](http://localhost:5050)
  - *Email*: `admin@example.com` (hoặc xem trong `.env`)
  - *Password*: `pgadmin_secure_password_2026` (xem trong `.env`)
- **Direct App (phục vụ đối soát/debug)**: [http://localhost:3000](http://localhost:3000)

### 6.3. Kiểm tra Security Headers qua lệnh curl
```bash
curl -I http://localhost:8081/
```

### 6.4. Kiểm tra kết nối từ Nginx tới App nội bộ
```bash
docker exec pm-nginx wget -qO- http://app:3000/health
```

---

## 7. Quản lý vòng đời dữ liệu (Persistence)

Dữ liệu PostgreSQL và cấu hình pgAdmin được lưu trữ độc lập trên hai named volume:
- `pm_postgres_data` -> dữ liệu PostgreSQL (bảng, dữ liệu mẫu, indexes).
- `pm_pgadmin_data` -> thông tin session và cấu hình của pgAdmin.

Khi thực hiện `docker compose down` rồi khởi động lại bằng `docker compose up -d`, toàn bộ dữ liệu dự án, người dùng và công việc vẫn được giữ nguyên vẹn.
