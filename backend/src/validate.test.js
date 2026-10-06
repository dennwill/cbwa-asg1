const test = require('node:test');
const assert = require('node:assert/strict');
const { validateQuote } = require('./validate');
const { calculateQuote } = require('./pricing');

const valid = {
  customerName: 'Jane Citizen',
  coverType: 'Single',
  applicant1Age: 35,
  applicant1CoverHistory: 'Yes',
  hospitalCover: 'Silver',
  extrasCover: 'Standard',
  paymentFrequency: 'Monthly',
  annualDiscount: 0,
};

const couple = { ...valid, coverType: 'Couple', applicant2Age: 33, applicant2CoverHistory: 'No' };

test('accepts a valid single quote and nulls applicant 2', () => {
  const { errors, value } = validateQuote(valid);
  assert.deepEqual(errors, {});
  assert.equal(value.applicant2Age, null);
  assert.equal(value.applicant2CoverHistory, null);
  assert.equal(value.notes, null);
});

test('validated output feeds straight into calculateQuote', () => {
  const { value } = validateQuote({ ...couple, coverType: 'Family', paymentFrequency: 'Yearly', annualDiscount: '5' });
  assert.equal(calculateQuote(value).monthlyPremium, 449.6);
});

test('single ignores any applicant 2 data sent', () => {
  const { errors, value } = validateQuote({ ...valid, applicant2Age: 5, applicant2CoverHistory: 'bogus' });
  assert.deepEqual(errors, {});
  assert.equal(value.applicant2Age, null);
});

test('couple and family require applicant 2 age and history', () => {
  for (const coverType of ['Couple', 'Family']) {
    const { errors, value } = validateQuote({ ...valid, coverType });
    assert.equal(value, null);
    assert.ok(errors.applicant2Age);
    assert.ok(errors.applicant2CoverHistory);
  }
});

test('applicant 2 age is range checked for couples', () => {
  assert.ok(validateQuote({ ...couple, applicant2Age: 17 }).errors.applicant2Age);
  assert.ok(validateQuote({ ...couple, applicant2Age: 101 }).errors.applicant2Age);
});

test('customer name is required, trimmed and length limited', () => {
  assert.ok(validateQuote({ ...valid, customerName: '   ' }).errors.customerName);
  assert.ok(validateQuote({ ...valid, customerName: undefined }).errors.customerName);
  assert.ok(validateQuote({ ...valid, customerName: 42 }).errors.customerName);
  assert.ok(validateQuote({ ...valid, customerName: 'x'.repeat(101) }).errors.customerName);
  assert.equal(validateQuote({ ...valid, customerName: '  Jane  ' }).value.customerName, 'Jane');
});

test('age boundaries 18 and 100 are accepted, 17 and 101 rejected', () => {
  assert.equal(validateQuote({ ...valid, applicant1Age: 18 }).value.applicant1Age, 18);
  assert.equal(validateQuote({ ...valid, applicant1Age: 100 }).value.applicant1Age, 100);
  assert.ok(validateQuote({ ...valid, applicant1Age: 17 }).errors.applicant1Age);
  assert.ok(validateQuote({ ...valid, applicant1Age: 101 }).errors.applicant1Age);
});

test('age rejects non-integers and non-numeric values', () => {
  for (const bad of [30.5, 'abc', NaN, Infinity, true, [], {}, '']) {
    assert.ok(validateQuote({ ...valid, applicant1Age: bad }).errors.applicant1Age, `should reject ${String(bad)}`);
  }
});

test('numeric strings from forms are accepted', () => {
  const { errors, value } = validateQuote({ ...valid, applicant1Age: ' 40 ', annualDiscount: '2.5' });
  assert.deepEqual(errors, {});
  assert.equal(value.applicant1Age, 40);
  assert.equal(value.annualDiscount, 2.5);
});

test('discount range is 0 to 10 inclusive', () => {
  assert.equal(validateQuote({ ...valid, annualDiscount: 10 }).value.annualDiscount, 10);
  assert.equal(validateQuote({ ...valid, annualDiscount: 0 }).value.annualDiscount, 0);
  assert.ok(validateQuote({ ...valid, annualDiscount: -1 }).errors.annualDiscount);
  assert.ok(validateQuote({ ...valid, annualDiscount: 10.01 }).errors.annualDiscount);
  assert.ok(validateQuote({ ...valid, annualDiscount: 'lots' }).errors.annualDiscount);
});

test('missing discount defaults to 0', () => {
  const { value } = validateQuote({ ...valid, annualDiscount: undefined });
  assert.equal(value.annualDiscount, 0);
});

test('enums reject unknown and wrongly cased values', () => {
  assert.ok(validateQuote({ ...valid, coverType: 'single' }).errors.coverType);
  assert.ok(validateQuote({ ...valid, hospitalCover: 'Platinum' }).errors.hospitalCover);
  assert.ok(validateQuote({ ...valid, extrasCover: 'Gold' }).errors.extrasCover);
  assert.ok(validateQuote({ ...valid, paymentFrequency: 'Weekly' }).errors.paymentFrequency);
  assert.ok(validateQuote({ ...valid, applicant1CoverHistory: 'Maybe' }).errors.applicant1CoverHistory);
});

test('cover levels and cover type are required', () => {
  const { errors } = validateQuote({ customerName: 'Jane' });
  for (const f of ['coverType', 'hospitalCover', 'extrasCover', 'paymentFrequency', 'applicant1Age', 'applicant1CoverHistory']) {
    assert.ok(errors[f], `${f} should be required`);
  }
});

test('reports every error at once', () => {
  const { errors } = validateQuote({ ...couple, customerName: '', applicant1Age: 5, applicant2Age: 200 });
  assert.deepEqual(Object.keys(errors).sort(), ['applicant1Age', 'applicant2Age', 'customerName']);
});

test('notes are optional, trimmed, and length limited', () => {
  assert.equal(validateQuote({ ...valid, notes: '  hello ' }).value.notes, 'hello');
  assert.equal(validateQuote({ ...valid, notes: '   ' }).value.notes, null);
  assert.ok(validateQuote({ ...valid, notes: 'x'.repeat(1001) }).errors.notes);
  assert.ok(validateQuote({ ...valid, notes: 123 }).errors.notes);
});

test('non-object bodies are rejected without throwing', () => {
  for (const bad of [null, undefined, 'text', 5, [], true]) {
    const { errors, value } = validateQuote(bad);
    assert.equal(value, null);
    assert.ok(errors.body);
  }
});
