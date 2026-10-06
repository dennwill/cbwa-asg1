import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getQuote, updateQuote } from '../api'
import QuoteForm from '../components/QuoteForm'
import { quoteToForm } from '../quoteForm'

export default function EditQuotePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getQuote(id)
      .then((quote) => !cancelled && setInitialValues(quoteToForm(quote)))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [id])

  const handleSubmit = async (payload) => {
    await updateQuote(id, payload)
    navigate(`/quotes/${id}`)
  }

  if (error) {
    return (
      <>
        <div className="banner banner-error" role="alert">
          {error}
        </div>
        <Link to="/">Back to quotes</Link>
      </>
    )
  }
  if (!initialValues) return <p>Loading...</p>

  return (
    <>
      <h1>Edit quote #{id}</h1>
      <QuoteForm
        initialValues={initialValues}
        submitLabel="Save changes"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/quotes/${id}`)}
      />
    </>
  )
}
