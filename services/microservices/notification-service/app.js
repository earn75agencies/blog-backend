const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const notificationRoutes = require('./routes/notification.routes');
const emailRoutes = require('./routes/email.routes');
const smsRoutes = require('./routes/sms.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sms', smsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});

module.exports = app;

