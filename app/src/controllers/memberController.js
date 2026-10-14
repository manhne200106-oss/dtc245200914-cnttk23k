const memberModel = require('../models/memberModel');

const memberController = {
  async addMember(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const { user_id, role } = req.body;

      if (isNaN(projectId)) {
        return res.redirect('/projects?error=Mã+dự+án+không+hợp+lệ');
      }

      if (!user_id || isNaN(parseInt(user_id, 10))) {
        return res.redirect(`/projects/${projectId}?error=Vui+lòng+chọn+thành+viên+hợp+lệ`);
      }

      await memberModel.add(projectId, parseInt(user_id, 10), role || 'Member');
      res.redirect(`/projects/${projectId}?success=Đã+thêm+thành+viên+vào+dự+án`);
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(projectId) || isNaN(userId)) {
        return res.redirect('/projects?error=Tham+số+không+hợp+lệ');
      }

      await memberModel.remove(projectId, userId);
      res.redirect(`/projects/${projectId}?success=Đã+xóa+thành+viên+khỏi+dự+án`);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = memberController;
