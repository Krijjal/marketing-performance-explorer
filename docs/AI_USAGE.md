# How AI was used

The brief allows AI tools and asks how they were used and checked. This project was built with Claude Code, Anthropic's coding agent, working from a written specification.

## What AI did

- Read the brief and inspected the dataset row by row.
- Proposed the folder structure, schema and milestones, which were approved before any code was written.
- Wrote the code, tests and first drafts of the documentation.
- Ran the checks and used the application in a real browser.

## What stayed under human direction

- The stack, the list of planted data issues and the rule never to write missing spend as zero.
- Feature priorities and what to skip.
- Plan approval at the start, and the decision to continue through each milestone.

## How the work was verified

| Piece | Check |
|---|---|
| Dataset facts | Row counts, types and each planted issue checked directly in the spreadsheet with a separate script |
| Schema | Integration tests prove each key and CHECK constraint rejects bad data |
| Pipeline | A dedicated test per planted issue and per general rule, plus a full run on the real file asserting each issue's row number |
| Repeat runs | Test proves a second run changes no data |
| Failures | Tests for a missing sheet, a file with no valid rows, and a load failing partway through |
| KPIs | Each KPI matched against a raw SQL query on the fact tables, and against values calculated separately from the spreadsheet in Python |
| Imputed spend | Confirmed by a second route: the series' impressions ratio gives the same 1846.8 |
| CSV export | Totals summed from the downloaded file matched the spreadsheet |
| UI | Used in a browser at phone, tablet and desktop widths, including console errors and page overflow |
| Clean setup | Fresh clone installed, linted, type checked, tested and built |

## Issues AI introduced or met, and how they were handled

- **A view that could not work.** The plan included a joined `v_performance_weekly` view. A channel filter changes which media rows count, so a fixed view could not serve it. It was replaced with a CTE in each query.
- **A misleading notice.** With the TV filter on, the page said "1 imputed value", when that value was distribution rather than spend. Found in browser testing. The notice now names each kind.
- **A wrong version assumption.** The latest TypeScript is outside the range `typescript-eslint` supports. It is pinned to 6.0.3.
- **Lint and type failures.** Recharts' dot props and tooltip labels were typed loosely on the first attempt, and the production build caught it.
- **Order of steps.** The planned order checked missing weeks before imputation, which would have hidden rows rejected during imputation. The order was changed.
- **Git identity.** The machine's global email was a work address, so a personal email was set for this repository before any push.

## Limits of this verification

Automated tests cover the pipeline and analytics. The UI has no automated browser tests, so it was checked by hand. Tests written by the same tool that wrote the code can share its assumptions, which is why KPI values were also calculated separately from the raw spreadsheet.
