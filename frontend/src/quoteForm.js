export const COVER_TYPES = ['Single', 'Couple', 'Family']
export const COVER_HISTORIES = ['Yes', 'No', 'Not sure']
export const HOSPITAL_LEVELS = ['None', 'Basic', 'Bronze', 'Silver', 'Gold']
export const EXTRAS_LEVELS = ['None', 'Basic', 'Standard', 'Premium']
export const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly']

export const MIN_AGE = 18
export const MAX_AGE = 100
export const MAX_DISCOUNT = 10

export const emptyForm = {
  customerName: '',
  coverType: '',
  applicant1Age: '',
  applicant1CoverHistory: '',
  applicant2Age: '',
  applicant2CoverHistory: '',
  hospitalCover: '',
  extrasCover: '',
  paymentFrequency: '',
  annualDiscount: '0',
  notes: '',
}

export const hasSecondApplicant = (coverType) => coverType === 'Couple' || coverType === 'Family'

const isBlank = (v) => String(v ?? '').trim() === ''

function checkAge(value, label) {
  if (isBlank(value)) return `${label} is required.`
  const n = Number(value)
  if (!Number.isInteger(n) || n < MIN_AGE || n > MAX_AGE) {
    return `${label} must be a whole number between ${MIN_AGE} and ${MAX_AGE}.`
  }
  return null
}

// Mirrors the backend rules so most mistakes are caught before a request is made
export function validateForm(values) {
  const errors = {}

  if (isBlank(values.customerName)) errors.customerName = 'Customer name is required.'
  else if (values.customerName.trim().length > 100) {
    errors.customerName = 'Customer name must be at most 100 characters.'
  }

  if (!values.coverType) errors.coverType = 'Select a cover type.'
  if (!values.hospitalCover) errors.hospitalCover = 'Select a hospital cover level.'
  if (!values.extrasCover) errors.extrasCover = 'Select an extras cover level.'
  if (!values.paymentFrequency) errors.paymentFrequency = 'Select a payment frequency.'

  const age1 = checkAge(values.applicant1Age, 'Applicant 1 age')
  if (age1) errors.applicant1Age = age1
  if (!values.applicant1CoverHistory) {
    errors.applicant1CoverHistory = 'Select Applicant 1 cover history.'
  }

  if (hasSecondApplicant(values.coverType)) {
    const age2 = checkAge(values.applicant2Age, 'Applicant 2 age')
    if (age2) errors.applicant2Age = age2
    if (!values.applicant2CoverHistory) {
      errors.applicant2CoverHistory = 'Select Applicant 2 cover history.'
    }
  }

  if (values.paymentFrequency === 'Yearly' && !isBlank(values.annualDiscount)) {
    const d = Number(values.annualDiscount)
    if (Number.isNaN(d) || d < 0 || d > MAX_DISCOUNT) {
      errors.annualDiscount = `Discount must be a number between 0 and ${MAX_DISCOUNT}.`
    }
  }

  if (values.notes.length > 1000) errors.notes = 'Notes must be at most 1000 characters.'

  return errors
}

export function formToPayload(values) {
  const second = hasSecondApplicant(values.coverType)
  const yearly = values.paymentFrequency === 'Yearly'
  return {
    customerName: values.customerName.trim(),
    coverType: values.coverType,
    applicant1Age: Number(values.applicant1Age),
    applicant1CoverHistory: values.applicant1CoverHistory,
    applicant2Age: second ? Number(values.applicant2Age) : null,
    applicant2CoverHistory: second ? values.applicant2CoverHistory : null,
    hospitalCover: values.hospitalCover,
    extrasCover: values.extrasCover,
    paymentFrequency: values.paymentFrequency,
    annualDiscount: yearly && !isBlank(values.annualDiscount) ? Number(values.annualDiscount) : 0,
    notes: values.notes.trim() || null,
  }
}

export function quoteToForm(quote) {
  return {
    customerName: quote.customerName,
    coverType: quote.coverType,
    applicant1Age: String(quote.applicant1Age),
    applicant1CoverHistory: quote.applicant1CoverHistory,
    applicant2Age: quote.applicant2Age === null ? '' : String(quote.applicant2Age),
    applicant2CoverHistory: quote.applicant2CoverHistory ?? '',
    hospitalCover: quote.hospitalCover,
    extrasCover: quote.extrasCover,
    paymentFrequency: quote.paymentFrequency,
    annualDiscount: String(quote.annualDiscount),
    notes: quote.notes ?? '',
  }
}
