/**
 * Basic validation middleware for forms and API requests
 */

const validateProject = (req, res, next) => {
  const { name, status } = req.body;
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Tên dự án không được để trống.');
  } else if (name.trim().length > 150) {
    errors.push('Tên dự án không được vượt quá 150 ký tự.');
  }

  const validStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Trạng thái dự án không hợp lệ.');
  }

  if (errors.length > 0) {
    req.validationErrors = errors;
  }
  next();
};

const validateTask = (req, res, next) => {
  const { title, project_id, status, priority } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Tiêu đề công việc không được để trống.');
  } else if (title.trim().length > 200) {
    errors.push('Tiêu đề công việc không được vượt quá 200 ký tự.');
  }

  if (project_id && isNaN(parseInt(project_id, 10))) {
    errors.push('Dự án được chọn không hợp lệ.');
  }

  const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Trạng thái công việc không hợp lệ (chỉ chấp nhận TODO, IN_PROGRESS, DONE).');
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
  if (priority && !validPriorities.includes(priority)) {
    errors.push('Độ ưu tiên không hợp lệ (chỉ chấp nhận LOW, MEDIUM, HIGH).');
  }

  if (errors.length > 0) {
    req.validationErrors = errors;
  }
  next();
};

const validateComment = (req, res, next) => {
  const { content } = req.body;
  const errors = [];

  if (!content || content.trim().length === 0) {
    errors.push('Nội dung bình luận không được để trống.');
  }

  if (errors.length > 0) {
    req.validationErrors = errors;
  }
  next();
};

const validateUser = (req, res, next) => {
  const { username, email, full_name, password } = req.body;
  const errors = [];
  const isCreate = req.method === 'POST' && !req.params.id;

  if (isCreate) {
    if (!username || username.trim().length < 3) {
      errors.push('Tên đăng nhập tối thiểu 3 ký tự.');
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      errors.push('Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch dưới, gạch ngang hoặc dấu chấm.');
    }

    if (!password || password.length < 6) {
      errors.push('Mật khẩu tối thiểu 6 ký tự.');
    }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email không đúng định dạng.');
  }

  if (!full_name || full_name.trim().length === 0) {
    errors.push('Họ và tên không được để trống.');
  }

  if (errors.length > 0) {
    req.validationErrors = errors;
  }
  next();
};

module.exports = {
  validateProject,
  validateTask,
  validateComment,
  validateUser,
};
