import { NavLink, Route, Routes } from 'react-router-dom'
import CreateQuotePage from './pages/CreateQuotePage'
import EditQuotePage from './pages/EditQuotePage'
import QuoteDetailPage from './pages/QuoteDetailPage'
import QuoteListPage from './pages/QuoteListPage'

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <span className="brand">HealthCoverSim</span>
          <nav>
            <NavLink to="/" end>
              Quotes
            </NavLink>
            <NavLink to="/quotes/new">New quote</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<QuoteListPage />} />
          <Route path="/quotes/new" element={<CreateQuotePage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/quotes/:id/edit" element={<EditQuotePage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}
