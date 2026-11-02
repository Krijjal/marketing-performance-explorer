-- These rows are the allowlist: the pipeline rejects any category not listed here.
INSERT INTO brand (name) VALUES ('Pulse'), ('Hearth');

INSERT INTO market (name) VALUES ('UK'), ('Germany');

INSERT INTO channel (name, channel_type) VALUES
  ('TV', 'tv'),
  ('Paid Search', 'digital'),
  ('Social', 'digital');
