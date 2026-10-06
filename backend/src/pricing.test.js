const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuote, LHC_STATEMENT } = require('./pricing');

const base = {
  coverType: 'Single',
  applicant1Age: 30,
  applicant1CoverHistory: 'Yes',
  applicant2Age: null,
  applicant2CoverHistory: null,
  hospitalCover: 'Silver',
  extrasCover: 'Standard',
  paymentFrequency: 'Monthly',
  annualDiscount: 0,
};

test('section 7 worked example', () => {
  const q = calculateQuote({
    ...base,
    coverType: 'Family',
    applicant1Age: 40,
    applicant1CoverHistory: 'No',
    applicant2Age: 35,
    applicant2CoverHistory: 'Yes',
    paymentFrequency: 'Yearly',
    annualDiscount: 5,
  });
  assert.equal(q.applicants[0].loadingPercent, 20);
  assert.equal(q.applicants[0].hospitalPremium, 192);
  assert.equal(q.applicants[1].loadingPercent, 0);
  assert.equal(q.applicants[1].hospitalPremium, 160);
  assert.equal(q.hospitalPremium, 352);
  assert.equal(q.extrasPremium, 90);
  assert.equal(q.familyFee, 30);
  assert.equal(q.monthlyPremium, 472);
  assert.equal(q.yearlyBeforeDiscount, 5664);
  assert.equal(q.yearlyAfterDiscount, 5380.8);
  assert.equal(q.finalTotal, 5380.8);
  assert.equal(q.lhcStatement, LHC_STATEMENT);
  assert.deepEqual(q.warnings, []);
});

test('single adult is priced once with no family fee', () => {
  const q = calculateQuote(base);
  assert.equal(q.adultCount, 1);
  assert.equal(q.monthlyPremium, 205);
  assert.equal(q.familyFee, 0);
});

test('couple has two adults but no family fee', () => {
  const q = calculateQuote({
    ...base,
    coverType: 'Couple',
    applicant2Age: 30,
    applicant2CoverHistory: 'Yes',
  });
  assert.equal(q.monthlyPremium, 410);
  assert.equal(q.familyFee, 0);
});

test('no loading at age 30 or under even with no history', () => {
  const q = calculateQuote({ ...base, applicant1Age: 30, applicant1CoverHistory: 'No' });
  assert.equal(q.applicants[0].loadingPercent, 0);
  const young = calculateQuote({ ...base, applicant1Age: 18, applicant1CoverHistory: 'No' });
  assert.equal(young.applicants[0].loadingPercent, 0);
});

test('loading is uncapped at age 100', () => {
  const q = calculateQuote({ ...base, applicant1Age: 100, applicant1CoverHistory: 'No' });
  assert.equal(q.applicants[0].loadingPercent, 140);
  assert.equal(q.hospitalPremium, 384);
});

test('not sure applies no loading and warns per applicant', () => {
  const q = calculateQuote({
    ...base,
    coverType: 'Couple',
    applicant1Age: 50,
    applicant1CoverHistory: 'Not sure',
    applicant2Age: 50,
    applicant2CoverHistory: 'Not sure',
  });
  assert.equal(q.hospitalPremium, 320);
  assert.deepEqual(q.warnings, [
    'Applicant 1 Cover history is unknown- LHC loading has not been applied. This quote may be inaccurate.',
    'Applicant 2 Cover history is unknown- LHC loading has not been applied. This quote may be inaccurate.',
  ]);
});

test('hospital none means no loading and no unknown-history warning', () => {
  const q = calculateQuote({
    ...base,
    hospitalCover: 'None',
    applicant1Age: 60,
    applicant1CoverHistory: 'No',
  });
  assert.equal(q.hospitalPremium, 0);
  assert.equal(q.applicants[0].loadingPercent, 0);
  assert.equal(q.monthlyPremium, 45);

  const unsure = calculateQuote({ ...base, hospitalCover: 'None', applicant1CoverHistory: 'Not sure' });
  assert.equal(unsure.warnings.length, 1);
});

test('loading applies to hospital only, not extras', () => {
  const q = calculateQuote({ ...base, applicant1Age: 40, applicant1CoverHistory: 'No' });
  assert.equal(q.hospitalPremium, 192);
  assert.equal(q.extrasPremium, 45);
});

test('monthly payers ignore the discount', () => {
  const q = calculateQuote({ ...base, paymentFrequency: 'Monthly', annualDiscount: 10 });
  assert.equal(q.discountPercent, 0);
  assert.equal(q.yearlyAfterDiscount, null);
  assert.equal(q.finalTotal, q.monthlyPremium);
  assert.equal(q.finalTotalPeriod, 'month');
});

test('yearly payers get the discount, including fractional percentages', () => {
  const q = calculateQuote({ ...base, paymentFrequency: 'Yearly', annualDiscount: 2.5 });
  assert.equal(q.yearlyBeforeDiscount, 2460);
  assert.equal(q.yearlyAfterDiscount, 2398.5);
  assert.equal(q.finalTotalPeriod, 'year');
});

test('no cover selected gives a zero premium', () => {
  const q = calculateQuote({ ...base, hospitalCover: 'None', extrasCover: 'None' });
  assert.equal(q.monthlyPremium, 0);
});
