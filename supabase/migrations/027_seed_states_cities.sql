-- ============================================
-- Seed core state and city reference data
-- ============================================

-- Ensure countries exist (idempotent)
WITH country_rows AS (
  SELECT * FROM (
    VALUES
      ('USA', 'United States of America'),
      ('INDIA', 'India')
  ) AS t(code, name)
)
INSERT INTO countries (code, name)
SELECT cr.code, cr.name
FROM country_rows cr
WHERE NOT EXISTS (
  SELECT 1 FROM countries c
  WHERE LOWER(c.code) = LOWER(cr.code)
);

-- Seed key states for USA and India
WITH state_rows AS (
  SELECT * FROM (
    VALUES
      ('USA', 'CA', 'California'),
      ('USA', 'NY', 'New York'),
      ('USA', 'TX', 'Texas'),
      ('USA', 'FL', 'Florida'),
      ('USA', 'IL', 'Illinois'),
      ('USA', 'GA', 'Georgia'),
      ('USA', 'WA', 'Washington'),
      ('USA', 'MA', 'Massachusetts'),
      ('USA', 'NJ', 'New Jersey'),
      ('USA', 'PA', 'Pennsylvania'),
      ('INDIA', NULL, 'Telangana'),
      ('INDIA', NULL, 'Karnataka'),
      ('INDIA', NULL, 'Tamil Nadu'),
      ('INDIA', NULL, 'Maharashtra'),
      ('INDIA', NULL, 'Andhra Pradesh'),
      ('INDIA', NULL, 'Kerala'),
      ('INDIA', NULL, 'Gujarat'),
      ('INDIA', NULL, 'Punjab'),
      ('INDIA', NULL, 'West Bengal'),
      ('INDIA', NULL, 'Uttar Pradesh')
  ) AS t(country_code, state_code, state_name)
)
INSERT INTO states (country_id, code, name)
SELECT c.country_id, sr.state_code, sr.state_name
FROM state_rows sr
JOIN countries c ON LOWER(c.code) = LOWER(sr.country_code)
WHERE NOT EXISTS (
  SELECT 1 FROM states s
  WHERE s.country_id = c.country_id
    AND LOWER(s.name) = LOWER(sr.state_name)
);

-- Seed major cities for seeded states
WITH city_rows AS (
  SELECT * FROM (
    VALUES
      ('USA', 'California', 'Los Angeles'),
      ('USA', 'California', 'San Francisco'),
      ('USA', 'California', 'San Diego'),
      ('USA', 'New York', 'New York City'),
      ('USA', 'New York', 'Buffalo'),
      ('USA', 'New York', 'Rochester'),
      ('USA', 'Texas', 'Houston'),
      ('USA', 'Texas', 'Austin'),
      ('USA', 'Texas', 'Dallas'),
      ('USA', 'Florida', 'Miami'),
      ('USA', 'Florida', 'Orlando'),
      ('USA', 'Florida', 'Tampa'),
      ('USA', 'Illinois', 'Chicago'),
      ('USA', 'Georgia', 'Atlanta'),
      ('USA', 'Washington', 'Seattle'),
      ('USA', 'Massachusetts', 'Boston'),
      ('USA', 'New Jersey', 'Newark'),
      ('USA', 'Pennsylvania', 'Philadelphia'),
      ('INDIA', 'Telangana', 'Hyderabad'),
      ('INDIA', 'Telangana', 'Warangal'),
      ('INDIA', 'Karnataka', 'Bengaluru'),
      ('INDIA', 'Karnataka', 'Mysuru'),
      ('INDIA', 'Tamil Nadu', 'Chennai'),
      ('INDIA', 'Tamil Nadu', 'Coimbatore'),
      ('INDIA', 'Maharashtra', 'Mumbai'),
      ('INDIA', 'Maharashtra', 'Pune'),
      ('INDIA', 'Andhra Pradesh', 'Visakhapatnam'),
      ('INDIA', 'Kerala', 'Kochi'),
      ('INDIA', 'Kerala', 'Thiruvananthapuram'),
      ('INDIA', 'Gujarat', 'Ahmedabad'),
      ('INDIA', 'Gujarat', 'Surat'),
      ('INDIA', 'Punjab', 'Chandigarh'),
      ('INDIA', 'West Bengal', 'Kolkata'),
      ('INDIA', 'West Bengal', 'Siliguri'),
      ('INDIA', 'Uttar Pradesh', 'Lucknow'),
      ('INDIA', 'Uttar Pradesh', 'Noida')
  ) AS t(country_code, state_name, city_name)
)
INSERT INTO cities (state_id, name)
SELECT s.state_id, cr.city_name
FROM city_rows cr
JOIN countries c ON LOWER(c.code) = LOWER(cr.country_code)
JOIN states s ON s.country_id = c.country_id AND LOWER(s.name) = LOWER(cr.state_name)
WHERE NOT EXISTS (
  SELECT 1 FROM cities existing
  WHERE existing.state_id = s.state_id
    AND LOWER(existing.name) = LOWER(cr.city_name)
);
