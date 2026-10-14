const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const { validateTask, validateComment } = require('../middleware/validator');

// Task list & filters
router.get('/', taskController.index);

// Task creation form & action
router.get('/new', taskController.newForm);
router.post('/', validateTask, taskController.create);

// Task detail, edit & update
router.get('/:id', taskController.show);
router.get('/:id/edit', taskController.editForm);
router.put('/:id', validateTask, taskController.update);
router.post('/:id/update', validateTask, taskController.update); // Fallback for standard POST
router.delete('/:id', taskController.delete);
router.post('/:id/delete', taskController.delete); // Fallback for standard POST

// Task comments
router.post('/:taskId/comments', validateComment, commentController.addComment);
router.delete('/:taskId/comments/:commentId', commentController.deleteComment);
router.post('/:taskId/comments/:commentId/delete', commentController.deleteComment); // Fallback for standard POST

module.exports = router;
