CREATE TABLE IF NOT EXISTS dishes (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'main',
  price       TEXT        NOT NULL DEFAULT '0 ₽',
  price_num   INTEGER     NOT NULL DEFAULT 0,
  emoji       TEXT        NOT NULL DEFAULT '🍽',
  description TEXT        NOT NULL DEFAULT '',
  ingr        TEXT        NOT NULL DEFAULT '',
  weight      TEXT        NOT NULL DEFAULT '',
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  visible     BOOLEAN     NOT NULL DEFAULT TRUE,
  img_url     TEXT        NOT NULL DEFAULT '',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dishes_updated_at ON dishes;
CREATE TRIGGER trg_dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
