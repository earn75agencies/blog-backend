const express = require('express');
const router = express.Router();
const {
  getSubscription,
  upgradeSubscription,
  createAd,
  getAds,
  createCrowdfunding,
  getCrowdfunding,
  backCrowdfunding,
} = require('../controllers/monetization.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/subscription', getSubscription);
router.post('/subscription/upgrade', upgradeSubscription);
router.post('/ads', createAd);
router.get('/ads', getAds);
router.post('/crowdfunding', createCrowdfunding);
router.get('/crowdfunding', getCrowdfunding);
router.post('/crowdfunding/:id/back', backCrowdfunding);

module.exports = router;

