-- Add all 50 US states (idempotent)
-- This migration adds the remaining 40 US states that were not in the initial seed

WITH state_rows AS (
  SELECT * FROM (
    VALUES
      -- Original 10 states already exist, included here for completeness
      ('USA', 'AL', 'Alabama'),
      ('USA', 'AK', 'Alaska'),
      ('USA', 'AZ', 'Arizona'),
      ('USA', 'AR', 'Arkansas'),
      ('USA', 'CA', 'California'),
      ('USA', 'CO', 'Colorado'),
      ('USA', 'CT', 'Connecticut'),
      ('USA', 'DE', 'Delaware'),
      ('USA', 'FL', 'Florida'),
      ('USA', 'GA', 'Georgia'),
      ('USA', 'HI', 'Hawaii'),
      ('USA', 'ID', 'Idaho'),
      ('USA', 'IL', 'Illinois'),
      ('USA', 'IN', 'Indiana'),
      ('USA', 'IA', 'Iowa'),
      ('USA', 'KS', 'Kansas'),
      ('USA', 'KY', 'Kentucky'),
      ('USA', 'LA', 'Louisiana'),
      ('USA', 'ME', 'Maine'),
      ('USA', 'MD', 'Maryland'),
      ('USA', 'MA', 'Massachusetts'),
      ('USA', 'MI', 'Michigan'),
      ('USA', 'MN', 'Minnesota'),
      ('USA', 'MS', 'Mississippi'),
      ('USA', 'MO', 'Missouri'),
      ('USA', 'MT', 'Montana'),
      ('USA', 'NE', 'Nebraska'),
      ('USA', 'NV', 'Nevada'),
      ('USA', 'NH', 'New Hampshire'),
      ('USA', 'NJ', 'New Jersey'),
      ('USA', 'NM', 'New Mexico'),
      ('USA', 'NY', 'New York'),
      ('USA', 'NC', 'North Carolina'),
      ('USA', 'ND', 'North Dakota'),
      ('USA', 'OH', 'Ohio'),
      ('USA', 'OK', 'Oklahoma'),
      ('USA', 'OR', 'Oregon'),
      ('USA', 'PA', 'Pennsylvania'),
      ('USA', 'RI', 'Rhode Island'),
      ('USA', 'SC', 'South Carolina'),
      ('USA', 'SD', 'South Dakota'),
      ('USA', 'TN', 'Tennessee'),
      ('USA', 'TX', 'Texas'),
      ('USA', 'UT', 'Utah'),
      ('USA', 'VT', 'Vermont'),
      ('USA', 'VA', 'Virginia'),
      ('USA', 'WA', 'Washington'),
      ('USA', 'WV', 'West Virginia'),
      ('USA', 'WI', 'Wisconsin'),
      ('USA', 'WY', 'Wyoming')
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

-- Add major cities for the new states
WITH city_rows AS (
  SELECT * FROM (
    VALUES
      -- Alabama
      ('USA', 'Alabama', 'Birmingham'),
      ('USA', 'Alabama', 'Montgomery'),
      ('USA', 'Alabama', 'Mobile'),
      -- Alaska
      ('USA', 'Alaska', 'Anchorage'),
      ('USA', 'Alaska', 'Juneau'),
      ('USA', 'Alaska', 'Fairbanks'),
      -- Arizona
      ('USA', 'Arizona', 'Phoenix'),
      ('USA', 'Arizona', 'Tucson'),
      ('USA', 'Arizona', 'Mesa'),
      -- Arkansas
      ('USA', 'Arkansas', 'Little Rock'),
      ('USA', 'Arkansas', 'Fort Smith'),
      ('USA', 'Arkansas', 'Fayetteville'),
      -- Colorado
      ('USA', 'Colorado', 'Denver'),
      ('USA', 'Colorado', 'Colorado Springs'),
      ('USA', 'Colorado', 'Aurora'),
      -- Connecticut
      ('USA', 'Connecticut', 'Hartford'),
      ('USA', 'Connecticut', 'Bridgeport'),
      ('USA', 'Connecticut', 'New Haven'),
      -- Delaware
      ('USA', 'Delaware', 'Wilmington'),
      ('USA', 'Delaware', 'Dover'),
      ('USA', 'Delaware', 'Newark'),
      -- Hawaii
      ('USA', 'Hawaii', 'Honolulu'),
      ('USA', 'Hawaii', 'Pearl City'),
      ('USA', 'Hawaii', 'Hilo'),
      -- Idaho
      ('USA', 'Idaho', 'Boise'),
      ('USA', 'Idaho', 'Meridian'),
      ('USA', 'Idaho', 'Nampa'),
      -- Indiana
      ('USA', 'Indiana', 'Indianapolis'),
      ('USA', 'Indiana', 'Fort Wayne'),
      ('USA', 'Indiana', 'Evansville'),
      -- Iowa
      ('USA', 'Iowa', 'Des Moines'),
      ('USA', 'Iowa', 'Cedar Rapids'),
      ('USA', 'Iowa', 'Davenport'),
      -- Kansas
      ('USA', 'Kansas', 'Wichita'),
      ('USA', 'Kansas', 'Overland Park'),
      ('USA', 'Kansas', 'Kansas City'),
      -- Kentucky
      ('USA', 'Kentucky', 'Louisville'),
      ('USA', 'Kentucky', 'Lexington'),
      ('USA', 'Kentucky', 'Bowling Green'),
      -- Louisiana
      ('USA', 'Louisiana', 'New Orleans'),
      ('USA', 'Louisiana', 'Baton Rouge'),
      ('USA', 'Louisiana', 'Shreveport'),
      -- Maine
      ('USA', 'Maine', 'Portland'),
      ('USA', 'Maine', 'Lewiston'),
      ('USA', 'Maine', 'Bangor'),
      -- Maryland
      ('USA', 'Maryland', 'Baltimore'),
      ('USA', 'Maryland', 'Frederick'),
      ('USA', 'Maryland', 'Rockville'),
      -- Michigan
      ('USA', 'Michigan', 'Detroit'),
      ('USA', 'Michigan', 'Grand Rapids'),
      ('USA', 'Michigan', 'Warren'),
      -- Minnesota
      ('USA', 'Minnesota', 'Minneapolis'),
      ('USA', 'Minnesota', 'Saint Paul'),
      ('USA', 'Minnesota', 'Rochester'),
      -- Mississippi
      ('USA', 'Mississippi', 'Jackson'),
      ('USA', 'Mississippi', 'Gulfport'),
      ('USA', 'Mississippi', 'Southaven'),
      -- Missouri
      ('USA', 'Missouri', 'Kansas City'),
      ('USA', 'Missouri', 'Saint Louis'),
      ('USA', 'Missouri', 'Springfield'),
      -- Montana
      ('USA', 'Montana', 'Billings'),
      ('USA', 'Montana', 'Missoula'),
      ('USA', 'Montana', 'Great Falls'),
      -- Nebraska
      ('USA', 'Nebraska', 'Omaha'),
      ('USA', 'Nebraska', 'Lincoln'),
      ('USA', 'Nebraska', 'Bellevue'),
      -- Nevada
      ('USA', 'Nevada', 'Las Vegas'),
      ('USA', 'Nevada', 'Henderson'),
      ('USA', 'Nevada', 'Reno'),
      -- New Hampshire
      ('USA', 'New Hampshire', 'Manchester'),
      ('USA', 'New Hampshire', 'Nashua'),
      ('USA', 'New Hampshire', 'Concord'),
      -- New Mexico
      ('USA', 'New Mexico', 'Albuquerque'),
      ('USA', 'New Mexico', 'Las Cruces'),
      ('USA', 'New Mexico', 'Rio Rancho'),
      -- North Carolina
      ('USA', 'North Carolina', 'Charlotte'),
      ('USA', 'North Carolina', 'Raleigh'),
      ('USA', 'North Carolina', 'Greensboro'),
      -- North Dakota
      ('USA', 'North Dakota', 'Fargo'),
      ('USA', 'North Dakota', 'Bismarck'),
      ('USA', 'North Dakota', 'Grand Forks'),
      -- Ohio
      ('USA', 'Ohio', 'Columbus'),
      ('USA', 'Ohio', 'Cleveland'),
      ('USA', 'Ohio', 'Cincinnati'),
      -- Oklahoma
      ('USA', 'Oklahoma', 'Oklahoma City'),
      ('USA', 'Oklahoma', 'Tulsa'),
      ('USA', 'Oklahoma', 'Norman'),
      -- Oregon
      ('USA', 'Oregon', 'Portland'),
      ('USA', 'Oregon', 'Salem'),
      ('USA', 'Oregon', 'Eugene'),
      -- Rhode Island
      ('USA', 'Rhode Island', 'Providence'),
      ('USA', 'Rhode Island', 'Warwick'),
      ('USA', 'Rhode Island', 'Cranston'),
      -- South Carolina
      ('USA', 'South Carolina', 'Columbia'),
      ('USA', 'South Carolina', 'Charleston'),
      ('USA', 'South Carolina', 'North Charleston'),
      -- South Dakota
      ('USA', 'South Dakota', 'Sioux Falls'),
      ('USA', 'South Dakota', 'Rapid City'),
      ('USA', 'South Dakota', 'Aberdeen'),
      -- Tennessee
      ('USA', 'Tennessee', 'Nashville'),
      ('USA', 'Tennessee', 'Memphis'),
      ('USA', 'Tennessee', 'Knoxville'),
      -- Utah
      ('USA', 'Utah', 'Salt Lake City'),
      ('USA', 'Utah', 'West Valley City'),
      ('USA', 'Utah', 'Provo'),
      -- Vermont
      ('USA', 'Vermont', 'Burlington'),
      ('USA', 'Vermont', 'South Burlington'),
      ('USA', 'Vermont', 'Rutland'),
      -- Virginia
      ('USA', 'Virginia', 'Virginia Beach'),
      ('USA', 'Virginia', 'Norfolk'),
      ('USA', 'Virginia', 'Chesapeake'),
      -- West Virginia
      ('USA', 'West Virginia', 'Charleston'),
      ('USA', 'West Virginia', 'Huntington'),
      ('USA', 'West Virginia', 'Morgantown'),
      -- Wisconsin
      ('USA', 'Wisconsin', 'Milwaukee'),
      ('USA', 'Wisconsin', 'Madison'),
      ('USA', 'Wisconsin', 'Green Bay'),
      -- Wyoming
      ('USA', 'Wyoming', 'Cheyenne'),
      ('USA', 'Wyoming', 'Casper'),
      ('USA', 'Wyoming', 'Laramie')
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
