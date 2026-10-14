const userModel = require('../models/userModel');

const userController = {
  async index(req, res, next) {
    try {
      const users = await userModel.findAll();
      res.render('users/index', {
        title: 'Quản Lý Người Dùng',
        currentNav: 'users',
        users,
        success: req.query.success || null,
        error: req.query.error || null,
      });
    } catch (err) {
      next(err);
    }
  },

  newForm(req, res) {
    res.render('users/new', {
      title: 'Thêm Người Dùng Mới',
      currentNav: 'users',
      user: {},
      errors: [],
      success: null,
      error: null,
    });
  },

  async create(req, res, next) {
    try {
      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('users/new', {
          title: 'Thêm Người Dùng Mới',
          currentNav: 'users',
          user: req.body,
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { username, email, password, full_name, role } = req.body;

      // Check unique username & email
      const existingUser = await userModel.findByUsername(username.trim());
      if (existingUser) {
        return res.status(400).render('users/new', {
          title: 'Thêm Người Dùng Mới',
          currentNav: 'users',
          user: req.body,
          errors: ['Tên đăng nhập đã tồn tại trong hệ thống.'],
          success: null,
          error: null,
        });
      }

      const existingEmail = await userModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(400).render('users/new', {
          title: 'Thêm Người Dùng Mới',
          currentNav: 'users',
          user: req.body,
          errors: ['Địa chỉ email đã được sử dụng.'],
          success: null,
          error: null,
        });
      }

      await userModel.create({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: full_name.trim(),
        role: role || 'Developer',
      });

      res.redirect('/users?success=Thêm+người+dùng+thành+công');
    } catch (err) {
      next(err);
    }
  },

  async editForm(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.redirect('/users?error=Mã+người+dùng+không+hợp+lệ');
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return res.redirect('/users?error=Không+tìm+thấy+người+dùng');
      }

      res.render('users/edit', {
        title: `Chỉnh Sửa - ${user.full_name}`,
        currentNav: 'users',
        user,
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
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.redirect('/users?error=Mã+người+dùng+không+hợp+lệ');
      }

      if (req.validationErrors && req.validationErrors.length > 0) {
        return res.status(400).render('users/edit', {
          title: 'Chỉnh Sửa Người Dùng',
          currentNav: 'users',
          user: { id: userId, ...req.body },
          errors: req.validationErrors,
          success: null,
          error: null,
        });
      }

      const { full_name, email, role, password } = req.body;

      // Check unique email conflict
      const existingEmail = await userModel.findByEmail(email.trim());
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).render('users/edit', {
          title: 'Chỉnh Sửa Người Dùng',
          currentNav: 'users',
          user: { id: userId, ...req.body },
          errors: ['Địa chỉ email này đã được tài khoản khác sử dụng.'],
          success: null,
          error: null,
        });
      }

      await userModel.update(userId, {
        full_name: full_name.trim(),
        email: email.trim(),
        role,
        password,
      });

      res.redirect('/users?success=Cập+nhật+người+dùng+thành+công');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return res.redirect('/users?error=Mã+người+dùng+không+hợp+lệ');
      }

      await userModel.delete(userId);
      res.redirect('/users?success=Đã+xóa+người+dùng+thành+công');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
