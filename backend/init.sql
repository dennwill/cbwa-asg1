CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) > 0),
  cover_type TEXT NOT NULL CHECK (cover_type IN ('Single', 'Couple', 'Family')),
  applicant1_age INTEGER NOT NULL CHECK (applicant1_age BETWEEN 18 AND 100),
  applicant1_cover_history TEXT NOT NULL CHECK (applicant1_cover_history IN ('Yes', 'No', 'Not sure')),
  applicant2_age INTEGER CHECK (applicant2_age IS NULL OR applicant2_age BETWEEN 18 AND 100),
  applicant2_cover_history TEXT CHECK (applicant2_cover_history IS NULL OR applicant2_cover_history IN ('Yes', 'No', 'Not sure')),
  hospital_cover TEXT NOT NULL CHECK (hospital_cover IN ('None', 'Basic', 'Bronze', 'Silver', 'Gold')),
  extras_cover TEXT NOT NULL CHECK (extras_cover IN ('None', 'Basic', 'Standard', 'Premium')),
  payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('Monthly', 'Yearly')),
  annual_discount REAL NOT NULL DEFAULT 0 CHECK (annual_discount BETWEEN 0 AND 10),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Single has no second applicant; Couple and Family must have one
  CHECK (
    (cover_type = 'Single' AND applicant2_age IS NULL AND applicant2_cover_history IS NULL)
    OR (cover_type <> 'Single' AND applicant2_age IS NOT NULL AND applicant2_cover_history IS NOT NULL)
  )
);
