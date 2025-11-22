const express = require('express');
const router = express.Router();
const {
  getRSSFeed,
  getCategoryRSSFeed,
  getAuthorRSSFeed,
  getAtomFeed,
} = require('../controllers/feed.controller');

// Public routes
router.get('/rss', getRSSFeed);
router.get('/rss/category/:slug', getCategoryRSSFeed);
router.get('/rss/author/:username', getAuthorRSSFeed);
router.get('/atom', getAtomFeed);

module.exports = router;

