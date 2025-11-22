const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  inviteMember,
  getWorkspace,
} = require('../controllers/workspace-collaboration.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/', createWorkspace);
router.post('/:id/invite', inviteMember);
router.get('/:id', getWorkspace);

module.exports = router;

