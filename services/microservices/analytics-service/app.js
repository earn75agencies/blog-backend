const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const analyticsRoutes = require('./routes/analytics.routes');
const eventRoutes = require('./routes/event.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/events', eventRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-service' });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Analytics service running on port ${PORT}`);
});

module.exports = app;

