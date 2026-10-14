const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const memberController = require('../controllers/memberController');
const { validateProject } = require('../middleware/validator');

// Project list & search
router.get('/', projectController.index);

// Project creation form & action
router.get('/new', projectController.newForm);
router.post('/', validateProject, projectController.create);

// Project detail, edit & update
router.get('/:id', projectController.show);
router.get('/:id/edit', projectController.editForm);
router.put('/:id', validateProject, projectController.update);
router.post('/:id/update', validateProject, projectController.update); // Fallback for standard POST
router.delete('/:id', projectController.delete);
router.post('/:id/delete', projectController.delete); // Fallback for standard POST

// Project members management
router.post('/:id/members', memberController.addMember);
router.delete('/:id/members/:userId', memberController.removeMember);
router.post('/:id/members/:userId/delete', memberController.removeMember); // Fallback for standard POST

module.exports = router;
