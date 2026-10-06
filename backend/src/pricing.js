const HOSPITAL_PRICES = { None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 };
const EXTRAS_PRICES = { None: 0, Basic: 25, Standard: 45, Premium: 70 };
const FAMILY_FEE = 30;

const LHC_STATEMENT =
  'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.';

// All maths is done in cents so rounding only happens once, at the end.
const toCents = (dollars) => Math.round(dollars * 100);
const toDollars = (cents) => cents / 100;
const fmt = (cents) =>
  '$' + toDollars(cents).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function lhcLoadingPercent(age, history, hospitalCover) {
  if (hospitalCover === 'None' || history !== 'No' || age <= 30) return 0;
  return (age - 30) * 2;
}

function calculateQuote(input) {
  const {
    coverType,
    applicant1Age,
    applicant1CoverHistory,
    applicant2Age,
    applicant2CoverHistory,
    hospitalCover,
    extrasCover,
    paymentFrequency,
    annualDiscount,
  } = input;

  const adultCount = coverType === 'Single' ? 1 : 2;
  const hospitalPrice = toCents(HOSPITAL_PRICES[hospitalCover]);
  const extrasPrice = toCents(EXTRAS_PRICES[extrasCover]);

  const people = [{ age: applicant1Age, history: applicant1CoverHistory }];
  if (adultCount === 2) people.push({ age: applicant2Age, history: applicant2CoverHistory });

  const warnings = [];
  const applicants = people.map((person, i) => {
    const label = i + 1;
    const loadingPercent = lhcLoadingPercent(person.age, person.history, hospitalCover);
    // price * (100 + pct) / 100 stays an integer because prices are whole dollars
    const hospitalCents = (hospitalPrice * (100 + loadingPercent)) / 100;

    if (person.history === 'Not sure') {
      warnings.push(
        `Applicant ${label} Cover history is unknown- LHC loading has not been applied. This quote may be inaccurate.`
      );
    }

    return {
      applicant: label,
      age: person.age,
      coverHistory: person.history,
      loadingPercent,
      hospitalPremium: toDollars(hospitalCents),
      _cents: hospitalCents,
    };
  });

  const hospitalCents = applicants.reduce((sum, a) => sum + a._cents, 0);
  const extrasCents = extrasPrice * adultCount;
  const familyFeeCents = coverType === 'Family' ? toCents(FAMILY_FEE) : 0;
  const monthlyCents = hospitalCents + extrasCents + familyFeeCents;
  const yearlyBeforeCents = monthlyCents * 12;

  const isYearly = paymentFrequency === 'Yearly';
  const discountPercent = isYearly ? annualDiscount : 0;
  const yearlyAfterCents = isYearly
    ? Math.round((yearlyBeforeCents * (100 - discountPercent)) / 100)
    : null;

  const explanation = [
    `${coverType} cover is priced for ${adultCount} adult${adultCount > 1 ? 's' : ''}.`,
    hospitalCover === 'None'
      ? 'No hospital cover selected, so the hospital premium is $0.00.'
      : `Hospital (${hospitalCover}) is ${fmt(hospitalPrice)} per adult, plus each adult's own LHC loading: ` +
        applicants.map((a) => `Applicant ${a.applicant} ${a.loadingPercent}% = ${fmt(a._cents)}`).join(', ') +
        `. Hospital total ${fmt(hospitalCents)}.`,
    extrasCover === 'None'
      ? 'No extras cover selected, so the extras premium is $0.00.'
      : `Extras (${extrasCover}) is ${fmt(extrasPrice)} x ${adultCount} adult${adultCount > 1 ? 's' : ''} = ${fmt(extrasCents)}, with no LHC loading.`,
  ];
  if (familyFeeCents) {
    explanation.push(`Family upgrade fee of ${fmt(familyFeeCents)} per month covers dependent children.`);
  }
  explanation.push(
    `Monthly premium: ${fmt(hospitalCents)} + ${fmt(extrasCents)} + ${fmt(familyFeeCents)} = ${fmt(monthlyCents)}.`,
    `Yearly before discount: ${fmt(monthlyCents)} x 12 = ${fmt(yearlyBeforeCents)}.`
  );
  if (isYearly) {
    explanation.push(
      `Paying yearly with a ${discountPercent}% discount: ${fmt(yearlyBeforeCents)} x (1 - ${discountPercent / 100}) = ${fmt(yearlyAfterCents)}.`
    );
  }

  return {
    adultCount,
    applicants: applicants.map(({ _cents, ...rest }) => rest),
    hospitalPremium: toDollars(hospitalCents),
    extrasPremium: toDollars(extrasCents),
    familyFee: toDollars(familyFeeCents),
    monthlyPremium: toDollars(monthlyCents),
    yearlyBeforeDiscount: toDollars(yearlyBeforeCents),
    discountPercent,
    yearlyAfterDiscount: yearlyAfterCents === null ? null : toDollars(yearlyAfterCents),
    finalTotal: toDollars(isYearly ? yearlyAfterCents : monthlyCents),
    finalTotalPeriod: isYearly ? 'year' : 'month',
    warnings,
    lhcStatement: LHC_STATEMENT,
    explanation,
  };
}

module.exports = {
  calculateQuote,
  lhcLoadingPercent,
  HOSPITAL_PRICES,
  EXTRAS_PRICES,
  FAMILY_FEE,
  LHC_STATEMENT,
};
