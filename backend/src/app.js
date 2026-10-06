const express = require('express');
const cors = require('cors');
const { createQuotesRouter } = require('./quotesRouter');

function createApp(db) {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/quotes', createQuotesRouter(db));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Express needs all four arguments to treat this as an error handler
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON.' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}

module.exports = { createApp };
