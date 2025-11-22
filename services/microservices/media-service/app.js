const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
require('dotenv').config();

const uploadRoutes = require('./routes/upload.routes');
const mediaRoutes = require('./routes/media.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.locals.upload = upload;

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'media-service' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Media service running on port ${PORT}`);
});

module.exports = app;

