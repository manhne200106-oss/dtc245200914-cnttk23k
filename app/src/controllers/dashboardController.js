const projectModel = require('../models/projectModel');
const taskModel = require('../models/taskModel');
const userModel = require('../models/userModel');

const dashboardController = {
  async getDashboard(req, res, next) {
    try {
      const [
        totalProjects,
        totalTasks,
        tasksInProgress,
        tasksDone,
        tasksTodo,
        totalUsers,
        recentProjects,
        highPriorityTasks,
      ] = await Promise.all([
        projectModel.count(),
        taskModel.count(),
        taskModel.countByStatus('IN_PROGRESS'),
        taskModel.countByStatus('DONE'),
        taskModel.countByStatus('TODO'),
        userModel.count(),
        projectModel.getRecent(5),
        taskModel.findAll({ priority: 'HIGH' }),
      ]);

      res.render('dashboard/index', {
        title: 'Bảng Điều Khiển - Quản Lý Dự Án',
        currentNav: 'dashboard',
        stats: {
          totalProjects,
          totalTasks,
          tasksInProgress,
          tasksDone,
          tasksTodo,
          totalUsers,
        },
        recentProjects,
        highPriorityTasks: highPriorityTasks.slice(0, 5),
        success: req.query.success || null,
        error: req.query.error || null,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dashboardController;
