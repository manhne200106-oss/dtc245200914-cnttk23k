/**
 * Error Handling Middleware
 */

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  res.status(404);
  if (req.accepts('html')) {
    return res.render('errors/404', {
      title: '404 - Không tìm thấy trang',
      path: req.originalUrl,
      currentNav: '',
      message: 'Trang bạn yêu cầu không tồn tại hoặc đã bị di dời.',
    });
  }
  return res.json({ error: 'Not Found', path: req.originalUrl });
};

// Global Error Handler
const globalErrorHandler = (err, req, res, next) => {
  // Always log full error details on server for debugging
  console.error('[Server Error]:', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode);

  let userFriendlyMessage = 'Đã xảy ra lỗi trên hệ thống. Vui lòng thử lại sau.';

  // Map known PostgreSQL error codes to friendly messages
  if (err.code === '23505') {
    // Unique violation
    userFriendlyMessage = 'Dữ liệu đã tồn tại trong hệ thống (trùng lặp bản ghi duy nhất).';
  } else if (err.code === '23503') {
    // Foreign key violation
    userFriendlyMessage = 'Không thể thực hiện thao tác do có ràng buộc dữ liệu liên quan.';
  } else if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
    userFriendlyMessage = 'Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra dịch vụ PostgreSQL.';
  } else if (statusCode === 400 || err.isClientError) {
    userFriendlyMessage = err.message;
  }

  if (req.accepts('html')) {
    return res.render('errors/500', {
      title: `${statusCode} - Lỗi hệ thống`,
      currentNav: '',
      statusCode,
      message: userFriendlyMessage,
    });
  }

  return res.json({
    status: 'error',
    statusCode,
    message: userFriendlyMessage,
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};
