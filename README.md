# Hệ Thống Quản Lý Dự Án (Project Management System)

> Bài tập môn: **Triển khai và Quản trị Hệ thống Phần mềm**
> Đề tài 14: **Hệ thống Quản lý Dự án (Project Management)**

---

## 1. Giới thiệu

Hệ thống Quản lý Dự án là ứng dụng web cho phép doanh nghiệp và đội ngũ phát triển theo dõi tiến độ các dự án phần mềm, quản lý thành viên, phân công công việc (tasks), và thảo luận trao đổi thông qua bình luận (comments).

Hệ thống được đóng gói và vận hành hoàn toàn trên nền tảng Docker Compose, tích hợp đầy đủ hệ thống Reverse Proxy, bộ giải pháp giám sát chỉ số (Metrics Monitoring), hệ thống thu thập log tập trung (Centralized Logging), và các tiêu chuẩn bảo mật container (Hardening).

---

## 2. Công nghệ sử dụng (Tech Stack)

- **Backend Application**: Node.js, Express.js
- **Frontend / Template Engine**: EJS (Embedded JavaScript), Semantic HTML5, CSS3, Vanilla JavaScript
- **Database**: PostgreSQL 16 (Alpine)
- **Database Administration**: pgAdmin 4
- **Reverse Proxy & Gateway**: Nginx 1.27 (Alpine)
- **Metrics Monitoring**: Prometheus & Grafana
  - Docker Exporter (`ghcr.io/davidborzek/docker-exporter`)
  - Nginx Prometheus Exporter (`nginx/nginx-prometheus-exporter`)
  - PostgreSQL Prometheus Exporter (`prometheuscommunity/postgres-exporter`)
- **Centralized Logging**: Grafana Loki & Promtail
- **Database Client**: `node-postgres` (`pg` Pool với 100% Parameterized Queries)
- **Containerization & Orchestration**: Docker Engine & Docker Compose

---

## 3. Kiến trúc hệ thống (Architecture)

### 3.1. Luồng dữ liệu ứng dụng (Application Data Flow)
```text
[ Web Browser / Client ]
           │
           │ HTTP (:8081)
           ▼
     ┌───────────┐
     │ pm-nginx  │ (Reverse Proxy Gateway + Security Headers)
     └─────┬─────┘
           │
           │ http://app:3000 (Internal pm_backend_network)
           ▼
     ┌───────────┐
     │  pm-app   │ (Node.js / Express - Port 3000 đóng trên host)
     └─────┬─────┘
           │
           │ SQL via postgres:5432 (Internal pm_backend_network)
           ▼
     ┌───────────┐
     │pm-postgres│ (PostgreSQL 16 - Port 5432 đóng trên host)
     └───────────┘
```

### 3.2. Luồng giám sát & Quản lý Logs (Monitoring & Logging Flow)
```text
[ System Metrics Flow ]
  pm-docker-exporter (Docker Sock :ro) ──┐
  pm-nginx-exporter  (Nginx stub_status) ├──> pm-prometheus (:9090) ──> pm-grafana (:3001)
  pm-postgres-exporter (PostgreSQL 5432) ┘

[ Centralized Logging Flow ]
  Container stdout/stderr ──> Docker Socket (/var/run/docker.sock :ro)
                                     │
                                     ▼
                                pm-promtail (Log Shipper)
                                     │
                                     │ HTTP Push (Internal :3100)
                                     ▼
                                  pm-loki (Log Aggregation Store)
                                     │
                                     ▼
                                pm-grafana (LogQL Explore UI)
```

### 3.3. Phân tách mạng đa tầng (Network Segmentation)
Hệ thống sử dụng 2 Docker bridge networks độc lập nhằm đảm bảo nguyên tắc đặc quyền tối thiểu:
1. **`pm_backend_network`**: Mạng nội bộ cách ly cao, chỉ kết nối `app`, `postgres`, `pgadmin`, `nginx`, và `postgres-exporter`. Database PostgreSQL hoàn toàn không thuộc mạng monitoring, ngăn chặn nguy cơ xâm nhập từ các container giám sát.
2. **`pm_monitoring_network`**: Mạng giám sát nội bộ kết nối `prometheus`, `grafana`, `loki`, `promtail`, `docker-exporter`, `nginx-exporter`, `nginx`, và `postgres-exporter`.

---

## 4. Cấu trúc thư mục dự án (Project Structure)

```text
project-management/
├── .env.example                            # Tệp mẫu biến môi trường (an toàn, không lộ secret)
├── .gitignore                              # Danh sách loại trừ Git (loại bỏ .env, node_modules)
├── README.md                               # Tài liệu hướng dẫn hệ thống
├── docker-compose.yml                      # Cấu hình triển khai 11 Docker services & 2 networks
├── app/                                    # Mã nguồn ứng dụng Web Node.js
│   ├── .dockerignore
│   ├── Dockerfile                          # Dockerfile đa tầng chạy user non-root node:1000
│   ├── package.json
│   ├── package-lock.json
│   ├── public/                             # Tài nguyên tĩnh CSS, JS client-side
│   │   ├── css/style.css
│   │   └── js/main.js
│   ├── src/                                # Mã nguồn backend Express
│   │   ├── app.js                          # Express entrypoint
│   │   ├── controllers/                    # Điều hướng & xử lý nghiệp vụ
│   │   ├── db/index.js                     # Cấu hình pg.Pool an toàn
│   │   ├── middleware/validator.js         # Input validation
│   │   ├── models/                         # Data models với Parameterized Queries
│   │   └── routes/                         # Định nghĩa routes (projects, tasks, users...)
│   └── views/                              # Giao diện EJS templates
├── monitoring/                             # Cấu hình hệ thống giám sát & logging
│   ├── grafana/
│   │   ├── dashboards/
│   │   │   └── project_management.json     # Dashboard giám sát container, web server, DB
│   │   └── provisioning/
│   │       ├── dashboards/dashboards.yml   # Auto-provision dashboard
│   │       └── datasources/
│   │           ├── prometheus.yml          # Auto-provision Prometheus datasource
│   │           └── loki.yml                # Auto-provision Loki datasource
│   ├── loki/
│   │   └── loki-config.yml                 # Cấu hình storage TSDB & filesystem cho Loki
│   ├── prometheus/
│   │   └── prometheus.yml                  # Cấu hình scrape targets (4 jobs)
│   └── promtail/
│       └── promtail-config.yml             # Cấu hình Docker service discovery shipper
├── nginx/
│   └── nginx.conf                          # Cấu hình reverse proxy & HTTP Security Headers
├── pgadmin/
│   └── servers.json                        # Tự động đăng ký PostgreSQL server trong pgAdmin
└── postgres/
    └── init.sql                            # Schema CSDL và dữ liệu mẫu khởi tạo
```

---

## 5. Yêu cầu hệ thống (System Requirements)

- **Docker Engine** (hỗ trợ Docker Compose v2)
- **Docker Compose**
- **Git**

*(Không yêu cầu cài đặt Node.js hay PostgreSQL trên host do toàn bộ ứng dụng và dịch vụ phụ trợ đều chạy hoàn chỉnh bên trong container)*.

---

## 6. Cấu hình biến môi trường (Configuration)

Trước khi khởi chạy hệ thống, tạo tệp cấu hình môi trường `.env` từ tệp mẫu:

```bash
cp .env.example .env
```

Chỉnh sửa các giá trị bảo mật trong `.env` theo nhu cầu:
- `POSTGRES_DB`: Tên cơ sở dữ liệu (mặc định: `project_management`)
- `POSTGRES_USER`: Tên tài khoản CSDL
- `POSTGRES_PASSWORD`: Mật khẩu CSDL PostgreSQL
- `PGADMIN_DEFAULT_EMAIL`: Email quản trị viên pgAdmin
- `PGADMIN_DEFAULT_PASSWORD`: Mật khẩu đăng nhập pgAdmin
- `NGINX_PORT`: Cổng máy chủ proxy công khai (mặc định: `8081`)
- `GRAFANA_PORT`: Cổng máy chủ Grafana (mặc định: `3001`)
- `GRAFANA_ADMIN_USER`: Tài khoản quản trị Grafana
- `GRAFANA_ADMIN_PASSWORD`: Mật khẩu quản trị Grafana
- `PROMETHEUS_PORT`: Cổng Prometheus (mặc định: `9090`)

> [!IMPORTANT]
> Tệp `.env` đã được liệt kê trong `.gitignore` và tuyệt đối không bao giờ được commit lên Git repository.

---

## 7. Hướng dẫn khởi chạy (Deployment & Run)

### 7.1. Khởi chạy toàn bộ hệ thống
```bash
# Kiểm tra tính hợp lệ của cấu hình compose
docker compose config --quiet

# Khởi chạy toàn bộ 11 dịch vụ ở chế độ chạy ngầm
docker compose up -d
```

### 7.2. Kiểm tra trạng thái các container
```bash
docker compose ps
```

Toàn bộ các container phải ở trạng thái `Up` hoặc `Up (healthy)`.

---

## 8. Danh sách Dịch vụ & Địa chỉ truy cập (URLs & Endpoints)

Hệ thống tuân thủ nguyên tắc thu hẹp bề mặt tấn công (Minimal Attack Surface), chỉ mở **4 cổng cần thiết** ra máy chủ host:

| Dịch vụ | Container | Mạng (Networks) | URL Host | Cổng nội bộ | Mô tả & Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nginx Reverse Proxy** | `pm-nginx` | `backend`, `monitoring` | [http://localhost:8081](http://localhost:8081) | `80` | **Gateway chính**: Điểm truy cập duy nhất vào Web Application, áp dụng Security Headers |
| **Grafana** | `pm-grafana` | `monitoring` | [http://localhost:3001](http://localhost:3001) | `3000` | Dashboard giám sát hiệu năng & LogQL Explore |
| **Prometheus** | `pm-prometheus` | `monitoring` | [http://localhost:9090](http://localhost:9090) | `9090` | Web UI kiểm tra chỉ số và trạng thái Targets |
| **pgAdmin 4** | `pm-pgadmin` | `backend` | [http://localhost:5050](http://localhost:5050) | `80` | Quản trị giao diện trực quan cho PostgreSQL |
| **Web App (Node.js)** | `pm-app` | `backend` | **Không mở ra host** | `3000` | Chỉ truy cập an toàn qua Nginx Gateway |
| **PostgreSQL** | `pm-postgres` | `backend` | **Không mở ra host** | `5432` | Cô lập trong `pm_backend_network` |
| **Loki** | `pm-loki` | `monitoring` | **Không mở ra host** | `3100` | Chỉ nhận logs qua mạng `pm_monitoring_network` |
| **Promtail** | `pm-promtail` | `monitoring` | **Không mở ra host** | `9080` | Thu thập logs từ Docker socket |
| **Exporters (x3)** | `pm-*-exporter` | `monitoring` (hoặc cả 2) | **Không mở ra host** | Các cổng nội bộ | Cung cấp metrics cho Prometheus scrape |

---

## 9. Quản trị Cơ sở dữ liệu (Database & pgAdmin)

- **PostgreSQL 16 Alpine**: Quản lý dữ liệu quan hệ với các bảng `users`, `projects`, `project_members`, `tasks`, và `comments`. Khởi tạo cấu trúc bảng tự động qua script `postgres/init.sql`.
- **pgAdmin 4**: Giao diện trực quan tại [http://localhost:5050](http://localhost:5050).
  - Tự động đăng ký kết nối tới CSDL `postgres:5432` thông qua tệp cấu hình `pgadmin/servers.json`.
  - Đăng nhập bằng email và mật khẩu cấu hình trong `.env` (`PGADMIN_DEFAULT_EMAIL` và `PGADMIN_DEFAULT_PASSWORD`).

---

## 10. Hệ thống Giám sát Chỉ số (Metrics Monitoring)

Hệ thống Prometheus thu thập chỉ số tự động với tần suất 5 giây từ 4 jobs:
1. **Docker Containers (`docker-exporter`)**: Đo lường trạng thái CPU, Memory, Network I/O của toàn bộ các containers đang chạy.
2. **Nginx Web Server (`nginx-exporter`)**: Đo lường tổng số request, active connections, reading/writing/waiting states qua `/stub_status`.
3. **PostgreSQL Database (`postgres-exporter`)**: Đo lường active connections, database size, transactions commit/rollback.
4. **Prometheus Server**: Tự giám sát tiến trình Prometheus.

**Grafana Dashboard**:
- Truy cập tại [http://localhost:3001](http://localhost:3001) (đăng nhập bằng tài khoản trong `.env`).
- Dashboard **"Project Management Monitoring"** được nạp tự động qua provisioning, hiển thị biểu đồ trực quan cho cả 3 thành phần: Containers, Nginx và PostgreSQL.

---

## 11. Thu thập & Phân tích Logs Tập trung (Centralized Logging)

Hệ thống sử dụng cặp đôi **Promtail + Grafana Loki**:
- **Promtail**: Kết nối Docker socket `/var/run/docker.sock:ro`, tự động nhận dạng các container mang tiền tố `pm-`, gắn nhãn metadata (`service_name`, `container`, `stream`) và chuyển tiếp log streams qua giao thức HTTP tới Loki.
- **Loki**: Lưu trữ dữ liệu log theo khối thời gian trên persistent volume `pm_loki_data`.
- **Grafana Explore**: Tích hợp Datasource Loki phục vụ phân tích log theo cú pháp **LogQL**.

### Các câu truy vấn LogQL mẫu đã kiểm chứng thực tế:
1. **Lọc HTTP Requests qua Nginx Reverse Proxy**:
   ```logql
   {service_name="nginx"} |= "GET"
   ```
2. **Lọc phản hồi thành công HTTP 200 từ Express Application**:
   ```logql
   {service_name="app"} |= "200"
   ```
3. **Lọc thông báo vận hành của PostgreSQL Database**:
   ```logql
   {service_name="postgres"} |= "LOG:"
   ```

---

## 12. Bảo mật & Gia cố Hệ thống (Security & Hardening - Phase 7)

Hệ thống đã triển khai các tiêu chuẩn bảo mật container theo nguyên tắc phòng thủ theo chiều sâu (Defense in Depth):

- **Thực thi Non-Root**:
  - `pm-app`: Chạy với user `node` (`UID=1000`).
  - `pm-prometheus` & `pm-postgres-exporter`: Chạy với user `nobody` (`UID=65534`).
  - `pm-grafana`: Chạy với user `grafana` (`UID=472`).
  - `pm-loki`: Chạy với user `UID=10001`.
  - `pm-postgres`: Chạy với user hệ thống `postgres` (`UID=999`).
  - `pm-nginx`: Worker processes xử lý requests chạy với user `nginx` (`UID=101`).
- **Phân tách mạng đa tầng (Network Isolation)**: Tách riêng `pm_backend_network` và `pm_monitoring_network`. Database PostgreSQL không thể bị quét hoặc truy cập từ mạng giám sát.
- **Thu hẹp bề mặt tấn công**: Đóng toàn bộ cổng host của `app` (3000), `postgres` (5432), và `loki` (3100).
- **Ngăn chặn leo thang đặc quyền**:
  - Kích hoạt `security_opt: [no-new-privileges:true]` trên toàn bộ containers (ngoại trừ ngoại lệ kỹ thuật của pgAdmin do entrypoint nội bộ yêu cầu).
  - Áp dụng `cap_drop: [ALL]` triệt để cho 7 services: `app`, `prometheus`, `grafana`, `loki`, `docker-exporter`, `nginx-exporter`, `postgres-exporter`.
- **Bảo vệ Docker Socket**: Socket `/var/run/docker.sock` chỉ được gắn vào `docker-exporter` và `promtail` ở chế độ chỉ đọc (`:ro`).
- **HTTP Security Headers trên Nginx**: Cấu hình kiểm soát nghiêm ngặt các header: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy`, và `Content-Security-Policy`.
- **Vệ sinh Secrets**: Loại bỏ hoàn toàn `.env` khỏi Git repository; mã nguồn ứng dụng sử dụng 100% Parameterized Queries phòng chống triệt để SQL Injection.
- **Rủi ro còn lại (Residual Risk)**: `promtail` và `docker-exporter` vẫn cần quyền root để đọc metadata từ Docker daemon socket của host. Rủi ro này được giới hạn tối đa bằng chế độ read-only `:ro`, loại bỏ kernel capabilities và chặn leo thang đặc quyền.

---

## 13. Quản lý vòng đời dữ liệu (Data Persistence)

Toàn bộ dữ liệu quan trọng của hệ thống được lưu trữ bền vững trên các named volumes:
- `pm_postgres_data`: Dữ liệu CSDL PostgreSQL (bảng, dự án, công việc, thành viên, bình luận).
- `pm_pgadmin_data`: Cấu hình lưu trữ và phiên làm việc của pgAdmin.
- `pm_prometheus_data`: Dữ liệu chuỗi thời gian (time-series metrics).
- `pm_grafana_data`: Cấu hình giao diện và tài khoản Grafana.
- `pm_loki_data`: Lịch sử lưu trữ log chunks và chỉ mục của Loki.
- `pm_promtail_positions`: Vị trí offset đọc log của Promtail.

Dữ liệu được bảo toàn nguyên vẹn ngay cả khi thực hiện dừng toàn bộ cụm container:
```bash
docker compose down
docker compose up -d
```

---

## 14. Xử lý sự cố & Lệnh hữu ích (Troubleshooting & Useful Commands)

```bash
# Xem trạng thái hoạt động của toàn bộ dịch vụ
docker compose ps

# Theo dõi trực tiếp logs của từng dịch vụ
docker compose logs -f nginx
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f loki
docker compose logs -f promtail

# Kiểm tra tính sẵn sàng của API Loki từ bên trong mạng giám sát
docker compose exec promtail wget -qO- http://loki:3100/ready

# Khởi động lại một dịch vụ cụ thể
docker compose restart nginx
