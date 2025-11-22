const express = require('express');
const { getSitemap, getRobotsTxt } = require('../controllers/seo.controller');

const router = express.Router();

router.get('/sitemap', getSitemap);
router.get('/robots', getRobotsTxt);

module.exports = router;

