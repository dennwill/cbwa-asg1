const { calculateQuote } = require('./pricing');

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS"; turn it into a proper ISO string
const toIso = (sqliteTimestamp) => sqliteTimestamp.replace(' ', 'T') + 'Z';

function rowToQuote(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    coverType: row.cover_type,
    applicant1Age: row.applicant1_age,
    applicant1CoverHistory: row.applicant1_cover_history,
    applicant2Age: row.applicant2_age,
    applicant2CoverHistory: row.applicant2_cover_history,
    hospitalCover: row.hospital_cover,
    extrasCover: row.extras_cover,
    paymentFrequency: row.payment_frequency,
    annualDiscount: row.annual_discount,
    notes: row.notes,
    createdAt: toIso(row.created_at),
  };
}

function quoteToParams(value) {
  return {
    customer_name: value.customerName,
    cover_type: value.coverType,
    applicant1_age: value.applicant1Age,
    applicant1_cover_history: value.applicant1CoverHistory,
    applicant2_age: value.applicant2Age,
    applicant2_cover_history: value.applicant2CoverHistory,
    hospital_cover: value.hospitalCover,
    extras_cover: value.extrasCover,
    payment_frequency: value.paymentFrequency,
    annual_discount: value.annualDiscount,
    notes: value.notes,
  };
}

function withCalculation(quote) {
  return { ...quote, calculation: calculateQuote(quote) };
}

function withSummary(quote) {
  const { monthlyPremium, finalTotal, finalTotalPeriod } = calculateQuote(quote);
  return { ...quote, summary: { monthlyPremium, finalTotal, finalTotalPeriod } };
}

module.exports = { rowToQuote, quoteToParams, withCalculation, withSummary };
