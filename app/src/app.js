const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./db');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Request parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Support HTTP verbs like PUT and DELETE via _method query param or hidden field
app.use(methodOverride('_method'));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Global view helpers
app.use((req, res, next) => {
  res.locals.formatDate = (date) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(date);
    }
  };

  res.locals.getStatusBadge = (status) => {
    switch (status) {
      case 'DONE':
      case 'COMPLETED':
        return { label: 'Hoàn thành', class: 'badge-success' };
      case 'IN_PROGRESS':
        return { label: 'Đang thực hiện', class: 'badge-primary' };
      case 'TODO':
        return { label: 'Cần làm', class: 'badge-secondary' };
      case 'PLANNING':
        return { label: 'Lập kế hoạch', class: 'badge-info' };
      case 'ON_HOLD':
        return { label: 'Tạm hoãn', class: 'badge-warning' };
      default:
        return { label: status || 'Khác', class: 'badge-secondary' };
    }
  };

  res.locals.getPriorityBadge = (priority) => {
    switch (priority) {
      case 'HIGH':
        return { label: 'Cao', class: 'badge-danger' };
      case 'MEDIUM':
        return { label: 'Trung bình', class: 'badge-warning' };
      case 'LOW':
        return { label: 'Thấp', class: 'badge-info' };
      default:
        return { label: priority || 'Bình thường', class: 'badge-secondary' };
    }
  };

  next();
});

// Mount application routes
app.use('/', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server after verifying database connectivity
const startServer = async () => {
  try {
    console.log('[App] Checking PostgreSQL connection...');
    await db.testConnection(10, 2000);
    console.log('[App] Database connection established successfully.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(` Project Management Application (Phase 1) is running!`);
      console.log(` Port: ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[App Fatal] Could not connect to database at startup:', err.message);
    process.exit(1);
  }
};

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  console.log('[App] SIGTERM signal received: closing HTTP server and DB pool');
  await db.pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[App] SIGINT signal received: closing HTTP server and DB pool');
  await db.pool.end();
  process.exit(0);
});

// Run server
if (require.main === module) {
  startServer();
}

module.exports = app;
