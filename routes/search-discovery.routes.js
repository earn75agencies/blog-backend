const express = require('express');
const router = express.Router();
const {
  searchContent,
  getSearchSuggestions,
  getTrendingSearches,
} = require('../controllers/search-discovery.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', searchContent);
router.get('/suggestions', getSearchSuggestions);
router.get('/trending', getTrendingSearches);

module.exports = router;

