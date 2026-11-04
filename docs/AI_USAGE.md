# How I used AI

The brief allows AI tools and asks how they were used and how their output was checked. I built this project with Claude Code, Anthropic's coding agent, working from a written plan I approved before any code was written.

## What I handed to AI

- Reading the brief and going through the dataset row by row.
- Proposing the folder structure, the database schema and the milestones. I reviewed and approved these before any code was written.
- Writing the code, the tests and the first drafts of the documentation.
- Running the checks and using the app in a real browser.

## What I decided myself

- The stack: TypeScript, Next.js and PostgreSQL, which I cleared with the hiring manager by email.
- The list of planted data issues to handle, and the rule that missing spend is never written as zero.
- The rule that nothing is fixed silently: every change is logged with its original value.
- Which features to build first and which to leave out.
- Approving the plan at the start, and deciding whether to move on after each milestone.

## How I checked the work

| What | How it was checked |
|---|---|
| Facts about the dataset | Row counts, types and every planted issue checked directly against the spreadsheet with a separate script |
| Database schema | Integration tests prove every key and CHECK constraint rejects bad data |
| Pipeline | One test for each planted issue and each general rule, plus a full run on the real file that checks each issue is logged on its exact row |
| Running it twice | A test proves a second run changes no data |
| Failures | Tests for a missing sheet, a file with no valid rows, and a load that fails halfway through |
| KPIs | Each KPI compared against a raw SQL query on the fact tables, and against values calculated separately from the spreadsheet in Python |
| Filled in spend value | Confirmed a second way: this series' ratio of impressions to spend gives the same 1846.8 |
| CSV export | The totals in the downloaded file matched the spreadsheet |
| Interface | Used in a browser at phone, tablet and desktop sizes, checking for console errors and content spilling off the page |
| Clean setup | A fresh copy of the repository installed, linted, type checked, tested and built |
| Full test suite | I ran the whole suite myself, and every test passes |

## Problems AI introduced or ran into, and how they were fixed

- **A database view that could not work.** The plan had one joined view, `v_performance_weekly`. But a channel filter changes which media rows count, so a fixed view could never serve it. I replaced it with a CTE inside each query.
- **A misleading notice.** With the TV filter on, the page said "1 imputed value", but that value was a distribution figure, not spend. This showed up in browser testing. The notice now names each kind of estimate.
- **A wrong version assumption.** The newest TypeScript is not supported by `typescript-eslint` yet, so I pinned it to 6.0.3.
- **Loose types.** The first attempt typed the chart's dot props and tooltip labels too loosely. The production build caught it and it was fixed.
- **Steps in the wrong order.** The plan checked for missing weeks before filling gaps, which would have hidden rows rejected while filling. I changed the order.
- **Git identity.** The machine's global email was a work address, so I set my personal email for this repository before any push.

## Limits of this checking

The automated tests cover the pipeline and the analytics. The interface has no automated browser tests, so I checked it by hand. Tests written by the same tool that wrote the code can share the same wrong assumptions. That is why I also had the KPI values calculated separately from the raw spreadsheet, so the code is not only checked against itself.
