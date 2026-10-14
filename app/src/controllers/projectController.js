const projectModel = require('../models/projectModel');
const memberModel = require('../models/memberModel');
const taskModel = require('../models/taskModel');

const projectController = {
  async index(req, res, next) {
    try {
      const status = req.query.status || 'ALL';
      const search = req.query.search || '';

      const projects = await projectModel.findAll({ status, search });

      res.render('projects/index', {
        title: 'Danh Sách Dự Án',
        currentNav: 'projects',
        projects,
        filterStatus: status,
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
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return res.status(404).render('errors/404', {
          title: '404 - Dự án không tồn tại',
          currentNav: 'projects',
          path: req.originalUrl,
          message: 'Mã dự án không hợp lệ.',
        });
      }

      const project = await projectModel.findById(projectId);
      if (!project) {
        return res.status(404).render('errors/404', {
          title: '404 - Dự án không tồn tại',
          currentNav: 'projects',
          path: req.originalUrl,
          message: 'Không tìm thấy dự án yêu cầu.',
        });
      }

      const [members, tasks, availableUsers] = await Promise.all([
        memberModel.findByProjectId(projectId),
        taskModel.findByProjectId(projectId),
        memberModel.findNonMembers(projectId),
      ]);

      res.render('projects/show', {
        title: `${project.name} - Chi Tiết Dự Án`,
        currentNav: 'projects',
        project,
        members,
        tasks,
        availableUsers,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    } catch (err) {
      next(err);
    }
  },

  newForm(req, res) {
    res.render('projects/new', {
      title: 'Tạo Dự Án Mới',
      currentNav: 'projects',
      project: {},
      errors: [],
      success: null,
      error: null,
    });
  },

  async create(req, res, next) {
    try {
      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('projects/new', {
          title: 'Tạo Dự Án Mới',
          currentNav: 'projects',
          project: req.body,
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { name, description, status } = req.body;
      const created = await projectModel.create({ name, description, status });
      res.redirect(`/projects/${created.id}?success=Dự+án+được+tạo+thành+công`);
    } catch (err) {
      next(err);
    }
  },

  async editForm(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return res.redirect('/projects?error=Mã+dự+án+không+hợp+lệ');
      }

      const project = await projectModel.findById(projectId);
      if (!project) {
        return res.redirect('/projects?error=Không+tìm+thấy+dự+án');
      }

      res.render('projects/edit', {
        title: `Chỉnh Sửa - ${project.name}`,
        currentNav: 'projects',
        project,
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
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return res.redirect('/projects?error=Mã+dự+án+không+hợp+lệ');
      }

      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('projects/edit', {
          title: `Chỉnh Sửa Dự Án`,
          currentNav: 'projects',
          project: { id: projectId, ...req.body },
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { name, description, status } = req.body;
      const updated = await projectModel.update(projectId, { name, description, status });
      if (!updated) {
        return res.redirect('/projects?error=Không+tìm+thấy+dự+án+để+cập+nhật');
      }

      res.redirect(`/projects/${projectId}?success=Cập+nhật+dự+án+thành+công`);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const projectId = parseInt(req.params.id, 10);
      if (isNaN(projectId)) {
        return res.redirect('/projects?error=Mã+dự+án+không+hợp+lệ');
      }

      const deleted = await projectModel.delete(projectId);
      if (!deleted) {
        return res.redirect('/projects?error=Không+tìm+thấy+dự+án+để+xóa');
      }

      res.redirect('/projects?success=Đã+xóa+dự+án+thành+công');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = projectController;
