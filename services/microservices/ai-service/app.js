const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const aiRoutes = require('./routes/ai.routes');
const recommendationRoutes = require('./routes/recommendation.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-service' });
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`AI service running on port ${PORT}`);
});

module.exports = app;

