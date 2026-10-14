const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validateUser } = require('../middleware/validator');

router.get('/', userController.index);
router.get('/new', userController.newForm);
router.post('/', validateUser, userController.create);
router.get('/:id/edit', userController.editForm);
router.put('/:id', validateUser, userController.update);
router.post('/:id/update', validateUser, userController.update); // Fallback for standard POST
router.delete('/:id', userController.delete);
router.post('/:id/delete', userController.delete); // Fallback for standard POST

module.exports = router;
