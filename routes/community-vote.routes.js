const express = require('express');
const router = express.Router();
const {
  vote,
  getVotes,
  removeVote,
} = require('../controllers/community-vote.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/:communityId/vote', vote);
router.get('/:communityId/votes', getVotes);
router.delete('/:communityId/vote/:voteId', removeVote);

module.exports = router;

