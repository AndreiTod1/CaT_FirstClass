CREATE TYPE camp_site_type   AS ENUM ('tent', 'rv', 'cabin', 'glamping');
CREATE TYPE booking_status   AS ENUM ('pending','confirmed','cancelled','rejected','completed');

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT,
    oauth_provider TEXT,
    oauth_id       TEXT,
    role           TEXT   NOT NULL DEFAULT 'member',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE camp_sites (
    id          SERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT,
    latitude    DECIMAL(9,6)  NOT NULL,
    longitude   DECIMAL(9,6)  NOT NULL,
    capacity    INTEGER       NOT NULL,
    region      TEXT,
    price       NUMERIC(10,2),
    type        camp_site_type,
    wifi        BOOLEAN NOT NULL DEFAULT false,
    shower      BOOLEAN NOT NULL DEFAULT false,
    parking     BOOLEAN NOT NULL DEFAULT false,
    barbecue    BOOLEAN NOT NULL DEFAULT false,
    status      BOOLEAN NOT NULL DEFAULT true,  
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    camp_site_id  INTEGER NOT NULL REFERENCES camp_sites(id)  ON DELETE CASCADE,
    start_date    DATE    NOT NULL,
    end_date      DATE    NOT NULL,
    status        booking_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT booking_dates_ck CHECK (end_date > start_date)
);

CREATE TABLE reviews (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    camp_site_id  INTEGER NOT NULL REFERENCES camp_sites(id) ON DELETE CASCADE,
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    media_urls    TEXT[],              
    likes         INT DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, camp_site_id)    
);

CREATE TABLE review_likes (
  review_id  INT REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id)   ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

CREATE OR REPLACE FUNCTION incr_likes() RETURNS trigger AS $$
BEGIN
  UPDATE reviews SET likes = likes + 1 WHERE id = NEW.review_id;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_insert
AFTER INSERT ON review_likes
FOR EACH ROW EXECUTE FUNCTION incr_likes();

CREATE INDEX idx_camp_sites_geo  ON camp_sites (latitude, longitude);
CREATE INDEX idx_bookings_dates  ON bookings   (camp_site_id, start_date, end_date);


INSERT INTO camp_sites
    (name, description, latitude, longitude, capacity,
     region, price, type,
     wifi, shower, parking, barbecue, status)
VALUES
('Valea Cernei Camp',
 'Camping de corturi pe malul Cernei',
 45.015234, 22.933087,  40,
 'Banat',  60.00, 'tent',
 false, false, true,  true, true),

('Blue Lake RV Park',
 'Parcare specializata pentru rulote, langa lacul albastru',
 44.676412, 23.457198,  25,
 'Oltenia', 120.00, 'rv',
 true,  true,  true,  true, false),

('Cabana Piatra Craiului',
 'Casute alpine din lemn',
 45.553901, 25.277612,  18,
 'Transilvania', 150.00, 'cabin',
 true,  true,  false, true, false),

('Glamping Sunflower Fields',
 'Corturi de lux printre lanuri de floarea-soarelui',
 44.879563, 28.660412,  12,
 'Dobrogea', 220.00, 'glamping',
 true,  true,  true,  false, false),

('Delta Wild Tent Base',
 'Ponton plutitor cu spatii de camping, acces direct la canalele Deltei pentru caiac/pescuit.',
 45.171832, 29.354771,  30,
 'Delta Dunarii',  80.00, 'tent',
 false, true,  false, true, true);

