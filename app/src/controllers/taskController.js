const taskModel = require('../models/taskModel');
const projectModel = require('../models/projectModel');
const userModel = require('../models/userModel');
const commentModel = require('../models/commentModel');

const taskController = {
  async index(req, res, next) {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId, 10) : null;
      const status = req.query.status || 'ALL';
      const priority = req.query.priority || 'ALL';
      const search = req.query.search || '';

      const [tasks, projects] = await Promise.all([
        taskModel.findAll({ projectId, status, priority, search }),
        projectModel.findAll(),
      ]);

      res.render('tasks/index', {
        title: 'Danh Sách Công Việc',
        currentNav: 'tasks',
        tasks,
        projects,
        selectedProject: projectId,
        selectedStatus: status,
        selectedPriority: priority,
        searchQuery: search,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    } catch (err) {
      next(err);
    }
  },

  async show(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return res.status(404).render('errors/404', {
          title: '404 - Công việc không tồn tại',
          currentNav: 'tasks',
          path: req.originalUrl,
          message: 'Mã công việc không hợp lệ.',
        });
      }

      const task = await taskModel.findById(taskId);
      if (!task) {
        return res.status(404).render('errors/404', {
          title: '404 - Công việc không tồn tại',
          currentNav: 'tasks',
          path: req.originalUrl,
          message: 'Không tìm thấy công việc yêu cầu.',
        });
      }

      const [comments, users] = await Promise.all([
        commentModel.findByTaskId(taskId),
        userModel.findAll(),
      ]);

      res.render('tasks/show', {
        title: `${task.title} - Chi Tiết Công Việc`,
        currentNav: 'tasks',
        task,
        comments,
        users,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    } catch (err) {
      next(err);
    }
  },

  async newForm(req, res, next) {
    try {
      const preselectedProjectId = req.query.project_id ? parseInt(req.query.project_id, 10) : null;
      const [projects, users] = await Promise.all([
        projectModel.findAll(),
        userModel.findAll(),
      ]);

      res.render('tasks/new', {
        title: 'Tạo Công Việc Mới',
        currentNav: 'tasks',
        task: {
          project_id: preselectedProjectId || '',
          status: 'TODO',
          priority: 'MEDIUM',
        },
        projects,
        users,
        errors: [],
        success: null,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const [projects, users] = await Promise.all([
        projectModel.findAll(),
        userModel.findAll(),
      ]);

      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('tasks/new', {
          title: 'Tạo Công Việc Mới',
          currentNav: 'tasks',
          task: req.body,
          projects,
          users,
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { project_id, title, description, status, priority, assigned_to } = req.body;
      const created = await taskModel.create({
        project_id: parseInt(project_id, 10),
        title,
        description,
        status,
        priority,
        assigned_to: assigned_to ? parseInt(assigned_to, 10) : null,
      });

      res.redirect(`/tasks/${created.id}?success=Tạo+công+việc+thành+công`);
    } catch (err) {
      next(err);
    }
  },

  async editForm(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return res.redirect('/tasks?error=Mã+công+việc+không+hợp+lệ');
      }

      const [task, projects, users] = await Promise.all([
        taskModel.findById(taskId),
        projectModel.findAll(),
        userModel.findAll(),
      ]);

      if (!task) {
        return res.redirect('/tasks?error=Không+tìm+thấy+công+việc');
      }

      res.render('tasks/edit', {
        title: `Chỉnh Sửa - ${task.title}`,
        currentNav: 'tasks',
        task,
        projects,
        users,
        errors: [],
        success: null,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return res.redirect('/tasks?error=Mã+công+việc+không+hợp+lệ');
      }

      const [projects, users] = await Promise.all([
        projectModel.findAll(),
        userModel.findAll(),
      ]);

      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('tasks/edit', {
          title: 'Chỉnh Sửa Công Việc',
          currentNav: 'tasks',
          task: { id: taskId, ...req.body },
          projects,
          users,
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { project_id, title, description, status, priority, assigned_to } = req.body;
      const updated = await taskModel.update(taskId, {
        title,
        description,
        status,
        priority,
        assigned_to: assigned_to ? parseInt(assigned_to, 10) : null,
        project_id: project_id ? parseInt(project_id, 10) : null,
      });

      if (!updated) {
        return res.redirect('/tasks?error=Không+tìm+thấy+công+việc+để+cập+nhật');
      }

      res.redirect(`/tasks/${taskId}?success=Cập+nhật+công+việc+thành+công`);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return res.redirect('/tasks?error=Mã+công+việc+không+hợp+lệ');
      }

      const deleted = await taskModel.delete(taskId);
      if (!deleted) {
        return res.redirect('/tasks?error=Không+tìm+thấy+công+việc+để+xóa');
      }

      res.redirect('/tasks?success=Đã+xóa+công+việc+thành+công');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = taskController;
