-- Runs once, when the Postgres volume is first created.
-- Tests reset their schema, so they need a database separate from development.
CREATE DATABASE marketing_test;
