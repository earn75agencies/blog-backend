const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationsRead,
  sendMessage,
  getChatMessages,
  reactToMessage,
} = require('../controllers/notification-messaging.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/notifications', getNotifications);
router.patch('/notifications/read', markNotificationsRead);
router.post('/messages', sendMessage);
router.get('/chats/:chatId/messages', getChatMessages);
router.post('/messages/:id/react', reactToMessage);

module.exports = router;

