import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api'
import {
  COVER_HISTORIES,
  COVER_TYPES,
  EXTRAS_LEVELS,
  HOSPITAL_LEVELS,
  MAX_AGE,
  MAX_DISCOUNT,
  MIN_AGE,
  PAYMENT_FREQUENCIES,
  formToPayload,
  hasSecondApplicant,
  validateForm,
} from '../quoteForm'
import Field from './Field'

export default function QuoteForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const formRef = useRef(null)

  const clientErrors = validateForm(values)
  const isYearly = values.paymentFrequency === 'Yearly'

  useEffect(() => {
    if (focusRequest > 0) formRef.current.querySelector('[aria-invalid="true"]')?.focus()
  }, [focusRequest])

  const errorFor = (name) =>
    serverErrors[name] || ((submitted || touched[name]) && clientErrors[name]) || undefined

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setServerErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleBlur = (name) => setTouched((prev) => ({ ...prev, [name]: true }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setFormError('')

    if (Object.keys(clientErrors).length > 0) {
      setFocusRequest((n) => n + 1)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(formToPayload(values))
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.details) {
        const fieldNames = Object.keys(values)
        const fieldErrors = {}
        const leftovers = []
        for (const [key, message] of Object.entries(err.details)) {
          if (fieldNames.includes(key)) fieldErrors[key] = message
          else leftovers.push(message)
        }
        setServerErrors(fieldErrors)
        setFormError(leftovers.join(' '))
        setFocusRequest((n) => n + 1)
      } else {
        setFormError(err.message)
      }
      setSubmitting(false)
    }
  }

  const fieldProps = (name) => ({
    name,
    value: values[name],
    error: errorFor(name),
    onChange: handleChange,
    onBlur: handleBlur,
  })

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="quote-form">
      {formError && (
        <div className="banner banner-error" role="alert">
          {formError}
        </div>
      )}
      {submitted && Object.keys(clientErrors).length > 0 && (
        <div className="banner banner-error" role="alert">
          Please fix the highlighted fields before saving.
        </div>
      )}

      <fieldset>
        <legend>Customer and cover</legend>
        <Field {...fieldProps('customerName')} label="Customer name" required maxLength={100} />
        <Field
          {...fieldProps('coverType')}
          label="Cover type"
          type="select"
          options={COVER_TYPES}
          required
          hint={
            values.coverType === 'Family'
              ? 'Family cover adds a flat $30/month fee for dependent children. Children’s ages are not needed.'
              : undefined
          }
        />
        <Field
          {...fieldProps('hospitalCover')}
          label="Hospital cover level"
          type="select"
          options={HOSPITAL_LEVELS}
          required
        />
        <Field
          {...fieldProps('extrasCover')}
          label="Extras cover level"
          type="select"
          options={EXTRAS_LEVELS}
          required
        />
      </fieldset>

      <fieldset>
        <legend>Applicant 1</legend>
        <Field
          {...fieldProps('applicant1Age')}
          label="Age"
          type="number"
          min={MIN_AGE}
          max={MAX_AGE}
          step={1}
          required
        />
        <Field
          {...fieldProps('applicant1CoverHistory')}
          label="Previous hospital cover history"
          type="select"
          options={COVER_HISTORIES}
          required
        />
      </fieldset>

      {hasSecondApplicant(values.coverType) && (
        <fieldset>
          <legend>Applicant 2</legend>
          <Field
            {...fieldProps('applicant2Age')}
            label="Age"
            type="number"
            min={MIN_AGE}
            max={MAX_AGE}
            step={1}
            required
          />
          <Field
            {...fieldProps('applicant2CoverHistory')}
            label="Previous hospital cover history"
            type="select"
            options={COVER_HISTORIES}
            required
          />
        </fieldset>
      )}

      <fieldset>
        <legend>Payment</legend>
        <Field
          {...fieldProps('paymentFrequency')}
          label="Payment frequency"
          type="select"
          options={PAYMENT_FREQUENCIES}
          required
        />
        <Field
          {...fieldProps('annualDiscount')}
          label="Annual-payment discount (%)"
          type="number"
          min={0}
          max={MAX_DISCOUNT}
          step="any"
          disabled={!isYearly}
          hint={isYearly ? `Between 0 and ${MAX_DISCOUNT}%.` : 'Only applies when paying yearly.'}
        />
      </fieldset>

      <fieldset>
        <legend>Notes</legend>
        <Field {...fieldProps('notes')} label="Notes (optional)" type="textarea" />
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
