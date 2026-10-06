const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('./db');

const single = {
  customer_name: 'Jane',
  cover_type: 'Single',
  applicant1_age: 35,
  applicant1_cover_history: 'Yes',
  applicant2_age: null,
  applicant2_cover_history: null,
  hospital_cover: 'Silver',
  extras_cover: 'Standard',
  payment_frequency: 'Monthly',
  annual_discount: 0,
  notes: null,
};

function insert(db, overrides = {}) {
  const row = { ...single, ...overrides };
  return db
    .prepare(
      `INSERT INTO quotes (customer_name, cover_type, applicant1_age, applicant1_cover_history,
         applicant2_age, applicant2_cover_history, hospital_cover, extras_cover,
         payment_frequency, annual_discount, notes)
       VALUES (@customer_name, @cover_type, @applicant1_age, @applicant1_cover_history,
         @applicant2_age, @applicant2_cover_history, @hospital_cover, @extras_cover,
         @payment_frequency, @annual_discount, @notes)`
    )
    .run(row);
}

test('creates the quotes table and stores a row with a timestamp', () => {
  const db = openDatabase(':memory:');
  const { lastInsertRowid } = insert(db);
  const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(lastInsertRowid);
  assert.equal(row.customer_name, 'Jane');
  assert.equal(row.applicant2_age, null);
  assert.ok(row.created_at);
});

test('running init twice does not fail or wipe data', () => {
  const db = openDatabase(':memory:');
  insert(db);
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'init.sql'), 'utf8'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM quotes').get().n, 1);
});

test('database rejects values the API should never send', () => {
  const db = openDatabase(':memory:');
  assert.throws(() => insert(db, { customer_name: '   ' }));
  assert.throws(() => insert(db, { cover_type: 'Group' }));
  assert.throws(() => insert(db, { applicant1_age: 17 }));
  assert.throws(() => insert(db, { applicant1_age: 101 }));
  assert.throws(() => insert(db, { applicant1_cover_history: 'Maybe' }));
  assert.throws(() => insert(db, { hospital_cover: 'Platinum' }));
  assert.throws(() => insert(db, { extras_cover: 'Gold' }));
  assert.throws(() => insert(db, { payment_frequency: 'Weekly' }));
  assert.throws(() => insert(db, { annual_discount: 11 }));
  assert.throws(() => insert(db, { annual_discount: -1 }));
});

test('applicant 2 fields must match the cover type', () => {
  const db = openDatabase(':memory:');
  assert.throws(() => insert(db, { applicant2_age: 30, applicant2_cover_history: 'Yes' }));
  assert.throws(() => insert(db, { cover_type: 'Couple' }));
  assert.throws(() => insert(db, { cover_type: 'Family', applicant2_age: 30 }));
  insert(db, { cover_type: 'Couple', applicant2_age: 30, applicant2_cover_history: 'No' });
});
