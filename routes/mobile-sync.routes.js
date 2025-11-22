const express = require('express');
const router = express.Router();
const {
  syncMobileSession,
  getOfflineCache,
  cacheForOffline,
  syncBookmarks,
  syncDrafts,
} = require('../controllers/mobile-sync.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/sync', syncMobileSession);
router.get('/offline-cache', getOfflineCache);
router.post('/offline-cache', cacheForOffline);
router.get('/sync/bookmarks', syncBookmarks);
router.get('/sync/drafts', syncDrafts);

module.exports = router;

