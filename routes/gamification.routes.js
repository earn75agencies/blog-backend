const express = require('express');
const router = express.Router();
const {
  getUserBadges,
  getUserAchievements,
  getLeaderboard,
  getLoyaltyPoints,
  getCreatorRank,
  getStreaks,
  getTournaments,
  joinTournament,
  getVirtualGoods,
  purchaseVirtualGood,
} = require('../controllers/gamification.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/badges', authenticate, getUserBadges);
router.get('/achievements', authenticate, getUserAchievements);
router.get('/leaderboard', getLeaderboard);
router.get('/loyalty-points', authenticate, getLoyaltyPoints);
router.get('/creator-rank', authenticate, getCreatorRank);
router.get('/streaks', authenticate, getStreaks);
router.get('/tournaments', getTournaments);
router.post('/tournaments/:id/join', authenticate, joinTournament);
router.get('/virtual-goods', getVirtualGoods);
router.post('/virtual-goods/:id/purchase', authenticate, purchaseVirtualGood);

module.exports = router;

