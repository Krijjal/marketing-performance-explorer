# Azure deployment plan

This is a written plan only. Nothing has been deployed.

## Architecture

| Need | Service | Why |
|---|---|---|
| Web application | Azure Container Apps | Runs a container with scale rules and little to operate |
| Data pipeline | Container Apps Job | Same image, run on demand or on a schedule, and it stops when done |
| Database | Azure Database for PostgreSQL Flexible Server | Managed Postgres 16 with backups and high availability |
| Secrets | Azure Key Vault | Keeps connection details out of code and images |
| Images | Azure Container Registry | Private image store |
| Source files | Azure Blob Storage | Keeps each input file for audit |
| Monitoring | Application Insights and Log Analytics | Traces, errors and searchable logs |

App Service would also work, and is a reasonable choice for a team that does not want containers. Container Apps fits better here because the app and the pipeline job can share one image and environment.

## Security

- **Identity:** the app and job use managed identities, so there are no stored credentials for Key Vault, the registry or Blob Storage. Postgres uses Microsoft Entra authentication where possible.
- **Sign-in:** the app needs a Dockerfile and Entra ID sign-in through Container Apps authentication, so only the organization's users get in.
- **Roles:** viewers can read dashboards and export. Only an operator role can run ingestion. The app's database user is read-only, and only the pipeline can write.
- **Network:** a VNet holds the Container Apps environment, and Postgres, Key Vault and Blob Storage use private endpoints with public access turned off.
- **Environments:** separate dev, test and production resource groups, each with its own secrets.

## Monitoring and error reporting

- Pino's JSON logs go to Log Analytics through the Container Apps log stream.
- Application Insights tracks requests, failures and response times.
- Alerts cover failed ingestion runs, 5xx rates, slow responses, and database CPU, storage and connections.
- `ingestion_run` and `data_quality_issue` remain the business record of each load. An alert fires on a failed run or on any new `error` severity issue.

## Scaling and performance

- The app scales out on concurrent HTTP requests, with a minimum of one replica in production to avoid cold starts.
- Each replica holds a `pg` pool, so pool size times replicas must stay under the database's connection limit. PgBouncer, built into Flexible Server, handles growth.
- The database scales up by changing compute tier. Read replicas can serve dashboards if reads ever compete with loads.
- With much more data, the first steps would be bulk loading, pre-aggregated tables and caching of common filter views.

## Reliability and backups

- Flexible Server provides automated backups with point-in-time restore. Production would use 35 days of retention and zone-redundant high availability.
- Geo-redundant backups depend on the client's recovery requirements.
- A restore should be rehearsed before go-live.
- Loads already run in one transaction, so a failed run leaves the previous data in place.

## CI/CD with GitHub Actions

1. On pull request: lint, typecheck, test and build (already in `.github/workflows/ci.yml`).
2. On merge to main: build the image, push to the registry and deploy to test.
3. Run migrations as a job before the new revision takes traffic.
4. A manual approval promotes the same image to production.
5. Actions signs in to Azure with OpenID Connect federation, so no long-lived secrets are stored in GitHub.
6. Container Apps revisions allow a gradual traffic shift and a quick rollback.

Infrastructure would be defined in Bicep and stored in the repository.
