const { HOSPITAL_PRICES, EXTRAS_PRICES } = require('./pricing');

const COVER_TYPES = ['Single', 'Couple', 'Family'];
const COVER_HISTORIES = ['Yes', 'No', 'Not sure'];
const HOSPITAL_LEVELS = Object.keys(HOSPITAL_PRICES);
const EXTRAS_LEVELS = Object.keys(EXTRAS_PRICES);
const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];

const MIN_AGE = 18;
const MAX_AGE = 100;
const MAX_DISCOUNT = 10;
const MAX_NAME_LENGTH = 100;
const MAX_NOTES_LENGTH = 1000;

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Forms send numbers as strings, so accept both but nothing else
function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v === 'string') return Number(v.trim());
  return NaN;
}

function checkEnum(errors, field, value, options, label) {
  if (isBlank(value)) {
    errors[field] = `${label} is required.`;
    return null;
  }
  if (!options.includes(value)) {
    errors[field] = `${label} must be one of: ${options.join(', ')}.`;
    return null;
  }
  return value;
}

function checkAge(errors, field, value, label) {
  if (isBlank(value)) {
    errors[field] = `${label} is required.`;
    return null;
  }
  const n = parseNumber(value);
  if (!Number.isInteger(n) || n < MIN_AGE || n > MAX_AGE) {
    errors[field] = `${label} must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`;
    return null;
  }
  return n;
}

// Returns { errors, value }. value is only meaningful when errors is empty.
function validateQuote(body) {
  const errors = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object.' }, value: null };
  }

  let customerName = null;
  if (isBlank(body.customerName)) {
    errors.customerName = 'Customer name is required.';
  } else if (typeof body.customerName !== 'string') {
    errors.customerName = 'Customer name must be text.';
  } else {
    customerName = body.customerName.trim();
    if (customerName.length > MAX_NAME_LENGTH) {
      errors.customerName = `Customer name must be at most ${MAX_NAME_LENGTH} characters.`;
    }
  }

  const coverType = checkEnum(errors, 'coverType', body.coverType, COVER_TYPES, 'Cover type');
  const hospitalCover = checkEnum(errors, 'hospitalCover', body.hospitalCover, HOSPITAL_LEVELS, 'Hospital cover level');
  const extrasCover = checkEnum(errors, 'extrasCover', body.extrasCover, EXTRAS_LEVELS, 'Extras cover level');
  const paymentFrequency = checkEnum(
    errors,
    'paymentFrequency',
    body.paymentFrequency,
    PAYMENT_FREQUENCIES,
    'Payment frequency'
  );

  const applicant1Age = checkAge(errors, 'applicant1Age', body.applicant1Age, 'Applicant 1 age');
  const applicant1CoverHistory = checkEnum(
    errors,
    'applicant1CoverHistory',
    body.applicant1CoverHistory,
    COVER_HISTORIES,
    'Applicant 1 cover history'
  );

  // Only Couple and Family need a second applicant; anything sent for Single is dropped
  let applicant2Age = null;
  let applicant2CoverHistory = null;
  if (coverType === 'Couple' || coverType === 'Family') {
    applicant2Age = checkAge(errors, 'applicant2Age', body.applicant2Age, 'Applicant 2 age');
    applicant2CoverHistory = checkEnum(
      errors,
      'applicant2CoverHistory',
      body.applicant2CoverHistory,
      COVER_HISTORIES,
      'Applicant 2 cover history'
    );
  }

  let annualDiscount = 0;
  if (!isBlank(body.annualDiscount)) {
    const n = parseNumber(body.annualDiscount);
    if (Number.isNaN(n) || n < 0 || n > MAX_DISCOUNT) {
      errors.annualDiscount = `Annual discount must be a number between 0 and ${MAX_DISCOUNT}.`;
    } else {
      annualDiscount = n;
    }
  }

  let notes = null;
  if (!isBlank(body.notes)) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Notes must be text.';
    } else if (body.notes.trim().length > MAX_NOTES_LENGTH) {
      errors.notes = `Notes must be at most ${MAX_NOTES_LENGTH} characters.`;
    } else {
      notes = body.notes.trim();
    }
  }

  if (Object.keys(errors).length > 0) return { errors, value: null };

  return {
    errors: {},
    value: {
      customerName,
      coverType,
      applicant1Age,
      applicant1CoverHistory,
      applicant2Age,
      applicant2CoverHistory,
      hospitalCover,
      extrasCover,
      paymentFrequency,
      annualDiscount,
      notes,
    },
  };
}

module.exports = {
  validateQuote,
  COVER_TYPES,
  COVER_HISTORIES,
  HOSPITAL_LEVELS,
  EXTRAS_LEVELS,
  PAYMENT_FREQUENCIES,
};
