# Priorities and decisions

The brief rewards a focused application with clear reasoning over a long feature list, so the priority was trustworthy numbers first and interface second.

## What was built

1. **A repeatable data pipeline.** It reads the workbook, validates, normalizes, removes duplicates, imputes, reports gaps and loads Postgres. Every issue is logged with its spreadsheet row.
2. **A normalized schema** with dimension tables, two weekly fact tables, CHECK constraints and audit tables.
3. **An analytics layer in SQL**, with each KPI tested against raw SQL and against values calculated separately from the spreadsheet.
4. **A three page application:** Overview, Compare periods and Data quality, with CSV export.
5. **Tests and CI:** lint, typecheck, unit and integration tests, and a production build.

## What was left out, and why

| Left out | Why |
|---|---|
| Regression or marketing mix modelling | 8 weeks across 4 series cannot support a fitted model. The result would look more certain than it is. |
| Anomaly detection | Lower priority than the core features, and thin on 8 data points. |
| Login and access control | Not needed to review a local application with synthetic data. The approach is in `AZURE_DEPLOYMENT.md`. |
| File upload in the UI | The pipeline is a command. Upload adds security and error handling work that does not help explore the data. |
| Azure deployment | The brief asks for a written approach only. |
| Containerizing the app | Docker runs Postgres. The app runs on Node directly, which keeps setup short. |
| Dark mode | No effect on the analysis. |

## Data handling decisions

### The five planted issues

| Issue | Row | Handling |
|---|---|---|
| `promotion_flag` of "Yes" | Business 22 | Converted to `true` |
| Null `distribution_pct` | Business 21 | Interpolated to 95 and flagged |
| Exact duplicate | Media 98, copy of 19 | Dropped |
| Channel "paid search" | Media 42 | Changed to "Paid Search" |
| Null `media_spend` | Media 82 | Interpolated to 1846.8 and flagged |

### General rules

- **Unknown categories** are rejected. The seeded dimension tables are the allowlist.
- **Negative values and out of range indexes** are rejected and logged. The index range is 50 to 200, a judgement call that also sits in the schema.
- **A duplicate key with different values** keeps the first row and logs an error, because neither version can be proven right.
- **Missing weeks** are reported and never invented.
- **A missing value at the edge of a series** is rejected, because extrapolating is a guess about a trend. This does not occur in the sample.
- **Reloads make the tables match the latest file**, so rows no longer in the file are removed. To stop a broken file wiping good data, a run stops before loading if a sheet has no valid rows.

## Limitations worth knowing

- **The "Yes" row may not be a real promotion.** Pulse UK on 2025-02-10 grew 3.2% week on week, against 16.3% and 9.8% in the other Pulse UK promotion weeks. The price index rose instead of falling, and Pulse Germany did not promote that week, unlike every other Pulse promotion. The value is kept as `true`, and a general rule raises a warning: a promotion whose price index did not fall. Only this row triggers it. The question should go to the data owner.
- **The distribution estimate is probably too high.** Interpolation gives 95. But Hearth Germany is exactly Hearth UK + 2 in every other week, which implies 93, and every series drops 3 points that week. A rule based on that pattern would fit this sample better, but it would be tuned to one synthetic quirk, so the simple method stays.
- **The spend estimate is well supported.** Neighbouring weeks give 1846.8, and this series' fixed 45 impressions per unit of spend gives the same figure on its own.
- **No currency is stated.** UK and German figures could be in different currencies. They are treated as one reporting currency and shown with no symbol.
- **Comparison averages are simple.** Each brand-market week counts equally, not by revenue, because that is easier to explain. A revenue-weighted version would suit a real business review better.

## Analysis decisions

- **ROAS is blended only**, because revenue is not recorded by channel. Dividing all revenue by one channel's spend would produce a large, meaningless number: Social would show about 57.
- **Periods compare per-week values**, so periods of different lengths stay comparable.
- **Drivers are read for consistency, not effect.** Each driver is checked against the direction you would normally expect, such as more distribution with more revenue. On the default comparison every driver lines up, which shows why this cannot prove a cause: they all rose together.
- **Revenue and spend use two aligned charts**, not one chart with two axes. Their scales differ about tenfold, and two axes make any relationship look stronger or weaker depending on the scaling.

What the default comparison shows: revenue per week rose 8.4% while spend rose 16.4%, so ROAS fell 6.9%, from 10.99 to 10.23.

## Technical trade-offs

- **`pg` over Drizzle:** more SQL by hand, but nothing hidden in a walkthrough.
- **Views stay small.** The first design had one joined performance view. It could not work, because the channel filter changes which media rows count, so each query aggregates media in a CTE before joining instead.
- **Index choice:** the fact table primary keys start with `week_start`, which serves date filters. With 128 rows, more indexes would add nothing measurable, so the only extra index is on the issue table's run id.
- **Row-by-row inserts:** simple and fast enough for this size. A bigger source would need bulk loading.
- **Plain HTML forms for filters:** they work with almost no client code, at the cost of an Apply button.
- **TypeScript 6, not 7:** `typescript-eslint` does not support 7 yet.
- **`xlsx` from the SheetJS tarball:** the npm package is stuck on a version with known advisories.

## Next steps

1. Confirm the "Yes" row, the currency and the missing values with the data owner.
2. Add browser tests for the main journeys, since the UI was checked by hand.
3. Add login and roles, then deploy as described in `AZURE_DEPLOYMENT.md`.
4. Add brand and market comparison views.
5. Revisit modelling once there is at least a year of data, using a proper media mix approach.
6. Move the index range and other limits into configuration if new data needs different limits.
7. Containerize the app so the whole stack starts with one command.
