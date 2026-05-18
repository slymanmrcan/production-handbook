# Port Strategy and Isolation

This policy keeps port usage predictable, avoids accidental exposure, and makes firewall rules easier to reason about.

## Policy

1. Public internet traffic should use only the edge ports: usually `80` and `443`.
2. App services should bind to `127.0.0.1` or a private interface unless they are intentionally public.
3. Databases and caches should not listen on public interfaces.
4. Host ports should be intentionally assigned, not chosen ad hoc.
5. Port numbers are operational identifiers, not security boundaries.

## Recommended Ranges

| Range | Purpose | Notes |
| :-- | :-- | :-- |
| `3000-3999` | Frontend / UI | Next.js, React admin panels, preview services |
| `4000-4999` | API / app services | Backend APIs, workers with HTTP listeners |
| `5000-5999` | Data services | Internal database or auxiliary services |
| `6000-6999` | Internal tools | Admin endpoints, diagnostics, private dashboards |
| `8000-8999` | Ops services | Monitoring, exporters, temporary admin interfaces |

Keep the ranges consistent inside one environment. Do not reuse the same port for unrelated services on the same host.

## Host vs Container Port

Use distinct host and container ports when a container must be reachable through the host network stack.

```yaml
ports:
  - "127.0.0.1:54321:5432"
```

This means:

- the host listens on `54321`
- the container still runs on `5432`
- the service is not reachable from the public network unless the firewall allows it

For private services, prefer `expose` or private networking over public port publishing.

## Exposure Rules

- Public: edge proxy only.
- Private: app, database, cache, admin tools.
- Temporary: debugging ports only during controlled incidents or staging tests.

If a service must be reachable from the internet, add an explicit reason in the deployment notes and pair it with firewall rules.

## Anti-Patterns

1. Publishing a database directly on `5432`.
2. Binding every service to `0.0.0.0` by default.
3. Using high random ports without a naming policy.
4. Assuming a different port number makes a service safe.
5. Leaving temporary debug listeners open after the incident.

## Example Allocation

| Service | Binding | Host Port | Comment |
| :-- | :-- | :-- | :-- |
| Edge proxy | `0.0.0.0` | `80/443` | Only public entry point |
| App API | `127.0.0.1` | `4000` | Reached through proxy |
| Admin panel | `127.0.0.1` | `3001` | Private UI |
| PostgreSQL | `127.0.0.1` | `54321` -> container `5432` | Private database access |
| Redis | `127.0.0.1` | `63790` -> container `6379` | Private cache access |

## Verification

```bash
ss -lntup
ufw status verbose
ip route
```

What to check:

- only expected ports are listening
- public exposure matches the deployment intent
- loopback-only services are not bound to external interfaces
- firewall rules match the documented port map
