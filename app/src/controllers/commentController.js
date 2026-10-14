const commentModel = require('../models/commentModel');

const commentController = {
  async addComment(req, res, next) {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const { user_id, content } = req.body;

      if (isNaN(taskId)) {
        return res.redirect('/tasks?error=Mã+công+việc+không+hợp+lệ');
      }

      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.redirect(`/tasks/${taskId}?error=${encodeURIComponent(req.validationErrors[0])}`);
      }

      await commentModel.create({
        task_id: taskId,
        user_id: user_id ? parseInt(user_id, 10) : null,
        content: content.trim(),
      });

      res.redirect(`/tasks/${taskId}?success=Đã+thêm+bình+luận`);
    } catch (err) {
      next(err);
    }
  },

  async deleteComment(req, res, next) {
    try {
      const taskId = parseInt(req.params.taskId, 10);
      const commentId = parseInt(req.params.commentId, 10);

      if (isNaN(taskId) || isNaN(commentId)) {
        return res.redirect('/tasks?error=Tham+số+không+hợp+lệ');
      }

      await commentModel.delete(commentId);
      res.redirect(`/tasks/${taskId}?success=Đã+xóa+bình+luận`);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = commentController;
