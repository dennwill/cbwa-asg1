import { useNavigate } from 'react-router-dom'
import { createQuote } from '../api'
import QuoteForm from '../components/QuoteForm'
import { emptyForm } from '../quoteForm'

export default function CreateQuotePage() {
  const navigate = useNavigate()

  const handleSubmit = async (payload) => {
    const quote = await createQuote(payload)
    navigate(`/quotes/${quote.id}`)
  }

  return (
    <>
      <h1>New quote</h1>
      <QuoteForm
        initialValues={emptyForm}
        submitLabel="Create quote"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />
    </>
  )
}
