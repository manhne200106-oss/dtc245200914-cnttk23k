-- =============================================================================
-- Project Management Database Schema & Seed Data (Phase 1)
-- =============================================================================

-- Clean up existing tables if any (for fresh initialization)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Auto-update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- -----------------------------------------------------------------------------
-- 1. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Developer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 2. Projects Table
-- -----------------------------------------------------------------------------
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING', -- PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 3. Project Members Table (Many-to-Many: Users <-> Projects)
-- -----------------------------------------------------------------------------
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Member', -- Manager, Member, Viewer
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_project_member UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- -----------------------------------------------------------------------------
-- 4. Tasks Table
-- -----------------------------------------------------------------------------
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO', -- TODO, IN_PROGRESS, DONE
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- -----------------------------------------------------------------------------
-- 5. Comments Table
-- -----------------------------------------------------------------------------
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Default hashed password: "password123" (bcrypt $2a$10$jFsa3lHkG0X/Rua1LAw29ONeATWLHM9tEyUCBBUo5r.R6YkmGtkfO)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@example.com', '$2a$10$jFsa3lHkG0X/Rua1LAw29ONeATWLHM9tEyUCBBUo5r.R6YkmGtkfO', 'Nguyễn Văn Quản Trị', 'Admin'),
('pm_alice', 'pm.alice@example.com', '$2a$10$jFsa3lHkG0X/Rua1LAw29ONeATWLHM9tEyUCBBUo5r.R6YkmGtkfO', 'Trần Thị Quản Lý', 'Project Manager'),
('dev_bob', 'dev.bob@example.com', '$2a$10$jFsa3lHkG0X/Rua1LAw29ONeATWLHM9tEyUCBBUo5r.R6YkmGtkfO', 'Lê Văn Phát Triển', 'Developer'),
('tester_charlie', 'tester.charlie@example.com', '$2a$10$jFsa3lHkG0X/Rua1LAw29ONeATWLHM9tEyUCBBUo5r.R6YkmGtkfO', 'Phạm Thị Kiểm Thử', 'Tester');

-- Projects
INSERT INTO projects (name, description, status) VALUES
('Website thương mại điện tử', 'Xây dựng nền tảng thương mại điện tử phục vụ bán hàng đa kênh, tích hợp thanh toán trực tuyến.', 'IN_PROGRESS'),
('Hệ thống quản lý sinh viên', 'Số hóa quy trình đăng ký môn học, tra cứu điểm và quản lý hồ sơ sinh viên cho nhà trường.', 'PLANNING'),
('Mobile App', 'Ứng dụng di động quản lý công việc cá nhân và hỗ trợ làm việc nhóm cho nền tảng iOS & Android.', 'IN_PROGRESS');

-- Project Members
-- Project 1: Website thương mại điện tử
INSERT INTO project_members (project_id, user_id, role) VALUES
(1, 2, 'Project Manager'), -- pm_alice
(1, 3, 'Developer'),       -- dev_bob
(1, 4, 'Tester');          -- tester_charlie

-- Project 2: Hệ thống quản lý sinh viên
INSERT INTO project_members (project_id, user_id, role) VALUES
(2, 2, 'Project Manager'), -- pm_alice
(2, 3, 'Developer');       -- dev_bob

-- Project 3: Mobile App
INSERT INTO project_members (project_id, user_id, role) VALUES
(3, 1, 'Admin'),           -- admin
(3, 2, 'Project Manager'), -- pm_alice
(3, 3, 'Developer');       -- dev_bob

-- Tasks
-- Tasks for Project 1 (Website thương mại điện tử)
INSERT INTO tasks (project_id, title, description, status, priority, assigned_to) VALUES
(1, 'Thiết kế database', 'Thiết kế lược đồ ERD, tối ưu hóa các bảng users, products, orders và indexes liên quan.', 'DONE', 'HIGH', 3),
(1, 'Xây dựng API', 'Phát triển RESTful API cho module Authentication, Product catalog và Giỏ hàng.', 'IN_PROGRESS', 'HIGH', 3),
(1, 'Testing', 'Viết unit tests và integration tests cho các endpoint quan trọng của hệ thống.', 'TODO', 'MEDIUM', 4);

-- Tasks for Project 2 (Hệ thống quản lý sinh viên)
INSERT INTO tasks (project_id, title, description, status, priority, assigned_to) VALUES
(2, 'Khảo sát yêu cầu', 'Phỏng vấn phòng đào tạo và thu thập danh sách nghiệp vụ quản lý điểm và đăng ký tín chỉ.', 'DONE', 'MEDIUM', 2),
(2, 'Thiết kế kiến trúc hệ thống', 'Lựa chọn stack công nghệ, mô hình triển khai microservices hoặc monolithic phù hợp.', 'TODO', 'HIGH', 3);

-- Tasks for Project 3 (Mobile App)
INSERT INTO tasks (project_id, title, description, status, priority, assigned_to) VALUES
(3, 'Thiết kế giao diện', 'Thiết kế UI/UX trên Figma cho màn hình Dashboard, Danh sách công việc và Cài đặt.', 'IN_PROGRESS', 'MEDIUM', 2),
(3, 'Tích hợp Push Notification', 'Cấu hình Firebase Cloud Messaging để gửi thông báo nhắc việc cho người dùng.', 'TODO', 'LOW', 3);

-- Comments
INSERT INTO comments (task_id, user_id, content) VALUES
(1, 3, 'Đã hoàn thành sơ đồ lược đồ quan hệ ERD và kiểm tra các ràng buộc foreign key.'),
(1, 2, 'Sơ đồ ERD đã được phê duyệt. Chuẩn bị bước cài đặt migration và seed data.'),
(2, 3, 'Đang tiến hành viết các endpoint cho Auth JWT và Catalog CRUD.'),
(3, 4, 'Đã chuẩn bị xong test plan và các test case checklist cho API testing.'),
(6, 2, 'Đã hoàn thành 80% wireframe màn hình chính, đang hoàn thiện UI kit.');
