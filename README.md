# Hệ Thống Quản Lý Dự Án (Project Management System)

> Bài tập môn: **Triển khai và Quản trị Hệ thống Phần mềm**
> Đề tài 14: **Hệ thống Quản lý Dự án (Project Management)**
> **Phase 5 (P5)**: Prometheus + Grafana Monitoring (Mốc Commit 2)

---

## 1. Giới thiệu

Hệ thống Quản lý Dự án là ứng dụng web cho phép doanh nghiệp và đội ngũ phát triển theo dõi tiến độ các dự án phần mềm, quản lý thành viên, phân công công việc (tasks), và thảo luận trao đổi thông qua bình luận (comments).

Trong **Phase 5 (P5 - Commit 2)**, hệ thống được tích hợp giải pháp giám sát tập trung toàn diện (**Prometheus + Grafana**) giám sát đủ 3 thành phần cốt lõi:
1. **Docker Containers**: Giám sát trạng thái hoạt động, CPU usage, Memory consumption, Network I/O và Block I/O của toàn bộ các container trong dự án.
2. **Nginx Web Server**: Giám sát số lượng active connections, handled/accepted connections, request rate (req/s), và các trạng thái đọc/ghi/chờ (reading/writing/waiting).
3. **PostgreSQL Database**: Giám sát số lượng kết nối đang hoạt động (active backends), commit/rollback transactions, tỷ lệ truy vấn và các thao tác trên dòng dữ liệu (tuples fetched, returned, inserted, updated).

---

## 2. Công nghệ sử dụng (Tech Stack)

- **Reverse Proxy**: Nginx 1.27 (Alpine)
- **Backend**: Node.js (v20 LTS), Express.js
- **Frontend / Template Engine**: EJS (Embedded JavaScript), Semantic HTML5, CSS3, Vanilla JavaScript
- **Database**: PostgreSQL 16 (Alpine)
- **Database Administration**: pgAdmin 4 (`dpage/pgadmin4:latest`)
- **Monitoring & Metrics Collection**:
  - **Prometheus** (`prom/prometheus:latest`)
  - **Grafana** (`grafana/grafana:latest`)
  - **Docker Exporter** (`ghcr.io/davidborzek/docker-exporter:latest`)
  - **Nginx Prometheus Exporter** (`nginx/nginx-prometheus-exporter:1.3.0`)
  - **PostgreSQL Exporter** (`prometheuscommunity/postgres-exporter:latest`)
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

=============================================================================
                  HỆ THỐNG GIÁM SÁT (MONITORING STACK)
=============================================================================
      [ Browser: Grafana Dashboard (:3001) ]
                        │
                        ▼
               ┌─────────────────┐
               │   pm-grafana    │ (Provisioned Dashboard & Prometheus Datasource)
               └────────┬────────┘
                        │ queries (:9090)
                        ▼
               ┌─────────────────┐
               │  pm-prometheus  │ (Scrapes metrics every 5s)
               └────────┬────────┘
                        │
         ┌──────────────┼──────────────┬──────────────┐
         ▼              ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
   │pm-docker- │  │ pm-nginx- │  │pm-postgres│  │Prometheus │
   │ exporter  │  │ exporter  │  │ -exporter │  │ (Internal)│
   │   (:8080) │  │  (:9113)  │  │  (:9187)  │  │  (:9090)  │
   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────────┘
         │              │              │
         ▼              ▼              ▼
   Docker Socket  Nginx Stub Status  PostgreSQL DB
   (/docker.sock) (/stub_status)     (:5432)
```

- **Mạng nội bộ (`pm_network`)**:
  - Toàn bộ 9 container hoạt động trên cùng bridge network `pm_network`.
  - Phân giải DNS tự động theo service name (`app`, `postgres`, `nginx`, `prometheus`, `grafana`, v.v.).
  - Các exporter kết nối trực tiếp với service tương ứng qua mạng nội bộ mà không cần public port ra ngoài host.

---

## 4. Danh sách Dịch vụ, Ports và Persistent Volumes

| Dịch vụ (Service) | Container Name | Image | Host Port | Container Port | Mục đích |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reverse Proxy** | `pm-nginx` | `nginx:1.27-alpine` | `8081` | `80` | Reverse Proxy + Security Headers + `/stub_status` |
| **Web App** | `pm-app` | `project-management-app` | `3000` | `3000` | Node.js Express Application |
| **PostgreSQL** | `pm-postgres` | `postgres:16-alpine` | `5432` | `5432` | Cơ sở dữ liệu chính (volume: `pm_postgres_data`) |
| **pgAdmin 4** | `pm-pgadmin` | `dpage/pgadmin4:latest` | `5050` | `80` | Quản trị CSDL (volume: `pm_pgadmin_data`) |
| **Prometheus** | `pm-prometheus` | `prom/prometheus:latest` | `9090` | `9090` | Thu thập và lưu trữ time-series metrics (volume: `prometheus_data`) |
| **Grafana** | `pm-grafana` | `grafana/grafana:latest` | `3001` | `3000` | Trực quan hóa dữ liệu giám sát (volume: `grafana_data`) |
| **Docker Exporter** | `pm-docker-exporter` | `ghcr.io/davidborzek/docker-exporter:latest` | N/A | `8080` | Thu thập metrics containers qua Docker socket |
| **Nginx Exporter** | `pm-nginx-exporter` | `nginx/nginx-prometheus-exporter:1.3.0` | N/A | `9113` | Thu thập metrics Nginx qua `/stub_status` |
| **Postgres Exporter** | `pm-postgres-exporter` | `prometheuscommunity/postgres-exporter:latest` | N/A | `9187` | Thu thập metrics PostgreSQL qua connection string |

> *Ghi chú về Port*:
> - Nginx được map sang cổng host `8081` (do cổng `8080` đang được dùng bởi dịch vụ khác trên host).
> - Grafana được map sang cổng host `3001:3000` để tránh trùng lặp với cổng `3000` của Web App.

---

## 5. Giám sát Hệ thống (Prometheus & Grafana)

### 5.1. Cấu hình Prometheus Scrape Targets
File cấu hình đặt tại [monitoring/prometheus/prometheus.yml](file:///home/manh/projects/project-management/monitoring/prometheus/prometheus.yml) tự động định kỳ scrape 4 targets sau (chu kỳ 5s):
1. `prometheus`: Tự giám sát server Prometheus (`localhost:9090`).
2. `containers`: Giám sát toàn bộ container trong project qua `docker-exporter:8080`.
3. `nginx`: Giám sát web server Nginx qua `nginx-exporter:9113`.
4. `postgres`: Giám sát hệ quản trị CSDL qua `postgres-exporter:9187`.

### 5.2. Tự động Provisioning Grafana
Toàn bộ cấu hình DataSource và Dashboard của Grafana được nạp tự động khi container khởi động (không cần thao tác thủ công qua UI):
- **Datasource Provisioning**: [monitoring/grafana/provisioning/datasources/prometheus.yml](file:///home/manh/projects/project-management/monitoring/grafana/provisioning/datasources/prometheus.yml) khai báo kết nối mặc định tới Prometheus (`http://prometheus:9090`).
- **Dashboard Provider**: [monitoring/grafana/provisioning/dashboards/dashboards.yml](file:///home/manh/projects/project-management/monitoring/grafana/provisioning/dashboards/dashboards.yml).
- **Dashboard JSON**: [monitoring/grafana/dashboards/project_management.json](file:///home/manh/projects/project-management/monitoring/grafana/dashboards/project_management.json) chứa Dashboard **"Project Management Monitoring"** với 3 hàng (rows) trực quan:
  - **🐳 Row 1: Docker Containers Monitoring**
    - Containers Running (Stat Panel)
    - Container CPU Usage (%) (Timeseries Panel)
    - Container Memory Usage (Timeseries Panel)
    - Container Network Traffic Rx/Tx (Timeseries Panel)
  - **🌐 Row 2: Nginx Web Server Monitoring**
    - Nginx Status (Stat Panel: ONLINE / DOWN)
    - Active Client Connections (Stat Panel)
    - Total HTTP Requests (Stat Panel)
    - Nginx Connection States: Reading / Writing / Waiting (Timeseries Panel)
    - Nginx Request Rate (req/s) & Handled Connections (Timeseries Panel)
  - **🐘 Row 3: PostgreSQL Database Monitoring**
    - PostgreSQL Status (Stat Panel: ONLINE / DOWN)
    - Active DB Connections (Stat Panel)
    - Committed Transactions (Stat Panel)
    - Transactions Rate: Commits / Rollbacks per sec (Timeseries Panel)
    - Row Operations: Tuples Fetched, Returned, Inserted, Updated per sec (Timeseries Panel)

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

### 6.2. Địa chỉ truy cập dịch vụ
- **Web Application (qua Nginx Reverse Proxy)**: [http://localhost:8081](http://localhost:8081)
- **Kiểm tra Healthcheck qua Nginx**: [http://localhost:8081/health](http://localhost:8081/health)
- **Grafana Monitoring Dashboard**: [http://localhost:3001](http://localhost:3001)
  - *Tài khoản*: `admin`
  - *Mật khẩu*: `admin_secure_password_2026` (xem trong `.env`)
  - *Đường dẫn Dashboard*: Vào `Dashboards` -> chọn **Project Management Monitoring**
- **Prometheus UI & Targets**: [http://localhost:9090](http://localhost:9090)
  - *Kiểm tra targets*: [http://localhost:9090/targets](http://localhost:9090/targets)
- **pgAdmin 4 (Quản trị DB)**: [http://localhost:5050](http://localhost:5050)
  - *Email*: `admin@example.com`
  - *Password*: `pgadmin_secure_password_2026`
- **Direct App (debug)**: [http://localhost:3000](http://localhost:3000)

### 6.3. Kiểm tra Targets Prometheus qua API
```bash
python3 -c "import urllib.request, json; data = json.loads(urllib.request.urlopen('http://localhost:9090/api/v1/targets').read()); print('\n'.join(f\"{t['labels']['job']} -> {t['health']}\" for t in data['data']['activeTargets']))"
```

### 6.4. Kiểm tra Security Headers qua lệnh curl
```bash
curl -I http://localhost:8081/
```

---

## 7. Quản lý vòng đời dữ liệu (Persistence)

Dữ liệu được lưu trữ an toàn trên các named volume:
- `pm_postgres_data`: Lưu trữ toàn bộ bảng, dữ liệu dự án, tasks, users, comments.
- `pm_pgadmin_data`: Lưu trữ cấu hình và sessions của pgAdmin.
- `prometheus_data`: Lưu trữ time-series metrics thu thập được.
- `grafana_data`: Lưu trữ cấu hình, alerts, sessions của Grafana.

Khi thực thi `docker compose down` rồi khởi chạy lại bằng `docker compose up -d`, toàn bộ dữ liệu ứng dụng và lịch sử giám sát metrics vẫn được bảo toàn nguyên vẹn.
