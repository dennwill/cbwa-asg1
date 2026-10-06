const express = require('express');
const { validateQuote } = require('./validate');
const { rowToQuote, quoteToParams, withCalculation, withSummary } = require('./quoteMapper');

const MAX_SEARCH_LENGTH = 100;

function createQuotesRouter(db) {
  const router = express.Router();

  const insertQuote = db.prepare(
    `INSERT INTO quotes (customer_name, cover_type, applicant1_age, applicant1_cover_history,
       applicant2_age, applicant2_cover_history, hospital_cover, extras_cover,
       payment_frequency, annual_discount, notes)
     VALUES (@customer_name, @cover_type, @applicant1_age, @applicant1_cover_history,
       @applicant2_age, @applicant2_cover_history, @hospital_cover, @extras_cover,
       @payment_frequency, @annual_discount, @notes)`
  );
  const updateQuote = db.prepare(
    `UPDATE quotes SET customer_name = @customer_name, cover_type = @cover_type,
       applicant1_age = @applicant1_age, applicant1_cover_history = @applicant1_cover_history,
       applicant2_age = @applicant2_age, applicant2_cover_history = @applicant2_cover_history,
       hospital_cover = @hospital_cover, extras_cover = @extras_cover,
       payment_frequency = @payment_frequency, annual_discount = @annual_discount, notes = @notes
     WHERE id = @id`
  );
  const searchQuotes = db.prepare(
    `SELECT * FROM quotes
     WHERE customer_name LIKE @pattern ESCAPE '\\' OR notes LIKE @pattern ESCAPE '\\'
     ORDER BY id DESC`
  );
  const selectOne = db.prepare('SELECT * FROM quotes WHERE id = ?');
  const deleteOne = db.prepare('DELETE FROM quotes WHERE id = ?');

  // Reject anything that isn't a plain positive integer before it reaches SQL
  router.param('id', (req, res, next, raw) => {
    const id = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Quote id must be a positive whole number.' });
    }
    req.quoteId = id;
    next();
  });

  const sendInvalid = (res, errors) =>
    res.status(400).json({ error: 'Validation failed.', details: errors });

  router.get('/', (req, res) => {
    const { q = '' } = req.query;
    if (typeof q !== 'string') {
      return res.status(400).json({ error: 'Search term must be a single text value.' });
    }

    // user-typed % and _ must match literally rather than act as wildcards
    const term = q.trim().slice(0, MAX_SEARCH_LENGTH).replace(/[\\%_]/g, '\\$&');
    const rows = searchQuotes.all({ pattern: `%${term}%` });
    res.json(rows.map((row) => withSummary(rowToQuote(row))));
  });

  router.get('/:id', (req, res) => {
    const row = selectOne.get(req.quoteId);
    if (!row) return res.status(404).json({ error: 'Quote not found.' });
    res.json(withCalculation(rowToQuote(row)));
  });

  router.post('/', (req, res) => {
    const { errors, value } = validateQuote(req.body);
    if (value === null) return sendInvalid(res, errors);

    const { lastInsertRowid } = insertQuote.run(quoteToParams(value));
    const row = selectOne.get(lastInsertRowid);
    res.status(201).json(withCalculation(rowToQuote(row)));
  });

  router.put('/:id', (req, res) => {
    if (!selectOne.get(req.quoteId)) return res.status(404).json({ error: 'Quote not found.' });

    const { errors, value } = validateQuote(req.body);
    if (value === null) return sendInvalid(res, errors);

    updateQuote.run({ ...quoteToParams(value), id: req.quoteId });
    res.json(withCalculation(rowToQuote(selectOne.get(req.quoteId))));
  });

  router.delete('/:id', (req, res) => {
    const { changes } = deleteOne.run(req.quoteId);
    if (changes === 0) return res.status(404).json({ error: 'Quote not found.' });
    res.status(204).end();
  });

  return router;
}

module.exports = { createQuotesRouter };
