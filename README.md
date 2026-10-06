# HealthCoverSim

A full-stack web app that simulates private health insurance quotes. Users can create, view, edit and delete quote records, and each quote shows an estimated monthly and yearly premium with a plain-English breakdown of how it was calculated.

Built for CSE3CWA/CSE5006 (Semester 7, 2026).

**Stack:** React (Vite) · Node.js + Express · SQLite (better-sqlite3) · plain CSS

## Installation

You need Node.js (developed and tested on Node 22). No separate database server is needed.

```bash
git clone https://github.com/dennwill/cbwa-asg1
cd cbwa-asg1

# backend (terminal 1)
cd backend
npm install
npm start

# frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173.

- The API runs on http://localhost:3001. The Vite dev server proxies `/api` requests to it, so the frontend needs no extra configuration.
- To use a different API port, set the `PORT` environment variable before `npm start` (`$env:PORT=3002` in PowerShell, `PORT=3002` in bash) and update the proxy target in `frontend/vite.config.js`.

## Database setup

There is nothing to run by hand. When the backend starts, `backend/src/db.js` creates the SQLite file at `backend/data/healthcoversim.db` (and the `data/` folder) if it does not exist, then runs `backend/init.sql`. The script uses `CREATE TABLE IF NOT EXISTS`, so restarting never wipes data.

- To start with an empty database, stop the backend and delete `backend/data/healthcoversim.db`.
- To use another file, set the `DB_PATH` environment variable.
- The `quotes` table follows the suggested schema (`id`, `customer_name`, `cover_type`, `applicant1_age`, `applicant1_cover_history`, `applicant2_age`, `applicant2_cover_history`, `hospital_cover`, `extras_cover`, `payment_frequency`, `annual_discount`, `notes`, `created_at`).
- The table has `CHECK` constraints on every column, including a rule that Applicant 2 fields must be `NULL` for Single cover and filled in for Couple and Family. The database rejects bad rows even if the API were to let one through.

## Features

- Create, list, view, edit and delete quotes.
- Search the quote list by customer name or notes (case-insensitive, matches part of a word).
- Applicant 2 fields only appear when Couple or Family is selected.
- The annual-payment discount can only be set when paying yearly.
- Explanation sheet on each quote: monthly premium, yearly premium before discount, hospital and extras premiums, each applicant's LHC loading %, the family upgrade fee, the final total, warnings, the required LHC statement, and a step-by-step explanation.
- Monthly payers see the monthly premium and yearly premium before discount. Yearly payers also see the discount and the yearly premium after discount.
- Validation in the form (field-by-field messages) and again on the server.

## How the calculation works

All pricing lives in `backend/src/pricing.js`. The frontend never calculates prices; it displays what the API returns, so the rules exist in one place.

| Item                            | Rule                                                    |
| ------------------------------- | ------------------------------------------------------- |
| Adults                          | Single = 1, Couple and Family = 2                       |
| Hospital (per adult, per month) | None $0, Basic $90, Bronze $120, Silver $160, Gold $220 |
| Extras (per adult, per month)   | None $0, Basic $25, Standard $45, Premium $70           |
| Family upgrade fee              | $30 per month for Family cover, otherwise $0            |

```
hospital total  = sum over adults of: hospital price x (1 + that adult's LHC loading)
extras total    = extras price x number of adults
monthly premium = hospital total + extras total + family fee
yearly (before) = monthly premium x 12
yearly (after)  = yearly before x (1 - discount%)       (yearly payers only)
```

Hospital and extras are priced separately and added together.

### Lifetime Health Cover (LHC) loading

LHC loading is worked out per applicant and applies **only to hospital cover**. The app always shows: _"Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover."_

| Previous cover | Loading                                         |
| -------------- | ----------------------------------------------- |
| Yes            | 0%                                              |
| No             | (age - 30) x 2% if age is over 30, otherwise 0% |
| Not sure       | 0%, and a warning is shown                      |

- If hospital cover is None, no loading is applied.
- For "Not sure" the quote shows: _"Applicant [1/2] Cover history is unknown- LHC loading has not been applied. This quote may be inaccurate."_ The warning is shown whenever the answer is "Not sure", even if hospital cover is None.

### Family cover

Family cover is priced as two adults (Applicant 1 and Applicant 2), plus the flat $30/month family upgrade fee, which covers dependent children. Children's ages are not collected. The fee is added automatically once, to the monthly premium, and is not affected by LHC loading or the extras price. It is multiplied by 12 with the rest of the premium for the yearly figure, and the annual-payment discount applies to the whole yearly total including the fee.

### Worked example

Family cover, Hospital Silver, Extras Standard, yearly payment with a 5% discount. Applicant 1 is 40 with no previous cover, and Applicant 2 is 35 with previous cover.

| Step                     | Calculation              | Result    |
| ------------------------ | ------------------------ | --------- |
| Applicant 1 hospital     | 20% loading: $160 x 1.20 | $192      |
| Applicant 2 hospital     | 0% loading               | $160      |
| Hospital total           | $192 + $160              | $352      |
| Extras total             | $45 x 2 adults           | $90       |
| Family fee               | flat                     | $30       |
| Monthly premium          | $352 + $90 + $30         | $472      |
| Yearly before discount   | $472 x 12                | $5,664    |
| Yearly after 5% discount | $5,664 x 0.95            | $5,380.80 |

This example is one of the automated tests.

## Validation

- Customer name is required (up to 100 characters).
- Cover type, hospital level, extras level, payment frequency and cover history must each be chosen from the allowed values.
- Ages must be whole numbers from 18 to 100. Applicant 2 age and history are required for Couple and Family, and ignored for Single.
- The discount must be between 0 and 10. It is only applied to yearly payments.
- Notes are optional (up to 1000 characters).

The API returns `400` with a `details` object keyed by field name, `404` for a missing quote, `413` for oversized bodies, and a generic `500` that never exposes internal errors. Malformed JSON, non-numeric ids and non-object bodies are handled without crashing.

## API

| Method | Path              | Description                                       |
| ------ | ----------------- | ------------------------------------------------- |
| GET    | `/api/quotes`     | List quotes (newest first) with a premium summary. Optional `?q=` filters by customer name or notes |
| GET    | `/api/quotes/:id` | One quote with its full calculation               |
| POST   | `/api/quotes`     | Create a quote (`201`)                            |
| PUT    | `/api/quotes/:id` | Replace a quote's fields                          |
| DELETE | `/api/quotes/:id` | Delete a quote (`204`)                            |

Request bodies use camelCase field names, for example `customerName`, `coverType`, `applicant1Age`, `hospitalCover`, `paymentFrequency`, `annualDiscount`.

## Running the tests

```bash
cd backend
npm test
```

This runs the pricing tests (including the worked example above), the validation tests, the database constraint tests, and API tests that exercise every route against an in-memory database.

## Project structure

```
backend/
  init.sql              database schema
  src/
    server.js           starts the server
    app.js              Express setup and error handling
    quotesRouter.js     CRUD routes
    pricing.js          premium calculation
    validate.js         input validation
    db.js               opens SQLite and runs init.sql
    quoteMapper.js      converts database rows to API objects
frontend/
  src/
    api.js              API client
    quoteForm.js        form options and client-side validation
    components/         QuoteForm, Field, ConfirmDialog
    pages/              create, list, detail, edit
```

## AI usage statement

**Tools used:** Claude Code (Anthropic, Claude Sonnet 5.5) inside VS Code. It was used to scaffold the project, and to write starter code for the pricing logic, validation, database setup, API routes, React pages and tests.

**What I checked manually:** After the starter codes, I would always learn what each function does and would always manually check the generated codes before pushing it to the repository. I would also test the backend with Postman, trying edge cases for validation. I also tested each section to make sure each stage worked well before moving on to the next one. Perhaps one more decision that I made is to separate the commits by concern instead of doing it all at once and then pushing it as the first commit. I installed extensions that would allow me to view the SQLite table easier instead of guessing what was in the columns.

**One independent decision I made:** I decided to add a search functionality as quotes will only grow and finding it manually would be extra work, so a search would eventually be a must-have.

## System limitation

LHC loading is not capped. The spec's formula, (age - 30) x 2%, is applied as written, so a 100-year-old with no previous cover gets a 140% loading. Real Australian Lifetime Health Cover loading is capped at 70%. Pricing is also a simplified model with fixed prices, so quotes are estimates only and do not reflect real insurer premiums, rebates or waiting periods.
