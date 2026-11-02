CREATE TABLE brand (
  id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE market (
  id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE channel (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text NOT NULL UNIQUE,
  channel_type text NOT NULL CHECK (channel_type IN ('tv', 'digital'))
);

CREATE TABLE ingestion_run (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_file   text NOT NULL,
  source_sha256 text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL DEFAULT 'running'
                CHECK (status IN ('running', 'succeeded', 'failed')),
  rows_read     integer NOT NULL DEFAULT 0 CHECK (rows_read >= 0),
  rows_loaded   integer NOT NULL DEFAULT 0 CHECK (rows_loaded >= 0),
  rows_rejected integer NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
  error_message text
);

CREATE TABLE data_quality_issue (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingestion_run_id integer NOT NULL REFERENCES ingestion_run (id),
  sheet            text NOT NULL,
  -- NULL for issues with no source row, such as a missing week.
  row_number       integer CHECK (row_number >= 1),
  rule             text NOT NULL,
  severity         text NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  action_taken     text NOT NULL
                   CHECK (action_taken IN ('normalized', 'imputed', 'dropped', 'rejected', 'reported')),
  field            text,
  original_value   text,
  corrected_value  text,
  message          text NOT NULL
);

-- The data quality page always reads one run's issues.
CREATE INDEX data_quality_issue_run_idx ON data_quality_issue (ingestion_run_id);

CREATE TABLE fact_business_weekly (
  week_start              date NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  brand_id                integer NOT NULL REFERENCES brand (id),
  market_id               integer NOT NULL REFERENCES market (id),
  revenue                 numeric(14, 2) NOT NULL CHECK (revenue >= 0),
  units_sold              integer NOT NULL CHECK (units_sold >= 0),
  is_promotion            boolean NOT NULL,
  price_index             numeric(6, 2) NOT NULL CHECK (price_index BETWEEN 50 AND 200),
  distribution_pct        numeric(5, 2) NOT NULL CHECK (distribution_pct BETWEEN 0 AND 100),
  distribution_is_imputed boolean NOT NULL DEFAULT false,
  competitor_price_index  numeric(6, 2) NOT NULL CHECK (competitor_price_index BETWEEN 50 AND 200),
  economic_index          numeric(6, 2) NOT NULL CHECK (economic_index BETWEEN 50 AND 200),
  ingestion_run_id        integer NOT NULL REFERENCES ingestion_run (id),
  PRIMARY KEY (week_start, brand_id, market_id)
);

-- The rule that TV has no impressions or clicks and digital has no GRPs is enforced
-- by the pipeline: a CHECK here cannot see channel_type in the channel table.
CREATE TABLE fact_media_weekly (
  week_start       date NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  brand_id         integer NOT NULL REFERENCES brand (id),
  market_id        integer NOT NULL REFERENCES market (id),
  channel_id       integer NOT NULL REFERENCES channel (id),
  -- NOT NULL so a missing spend can never be stored; it is imputed or the row is rejected.
  media_spend      numeric(14, 2) NOT NULL CHECK (media_spend >= 0),
  spend_is_imputed boolean NOT NULL DEFAULT false,
  impressions      bigint NOT NULL CHECK (impressions >= 0),
  clicks           bigint NOT NULL CHECK (clicks >= 0),
  tv_grps          numeric(8, 2) NOT NULL CHECK (tv_grps >= 0),
  ingestion_run_id integer NOT NULL REFERENCES ingestion_run (id),
  PRIMARY KEY (week_start, brand_id, market_id, channel_id),
  CHECK (clicks <= impressions)
);
