# LoadForge — Modern Load Testing Platform

## Docs Repo (GitHub — Yetkili Kaynak)

Tüm geliştirme takip dosyaları private repoda tutulur:
**https://github.com/OCA1782/dotnet-loadforge-docs**

Session başında:
1. `cd C:\PROJECTS\DOTNET\LoadForge\DOCS && git pull` ile senkronize et
2. Lokal dosyaları oku: `PROGRESS.md` → `DAILY_PROGRESS.md` → `TODO.md`

Docs commit akışı:
```bash
cd C:\PROJECTS\DOTNET\LoadForge\DOCS
git add -A && git commit -m "docs: <açıklama>" && git push
```

---

## Proje Özeti
JMeter benzeri, modern, ekip odaklı, cloud-native yük test platformu.
Teknoloji: .NET 10 LTS | Go 1.26 | Next.js 15 | PostgreSQL + TimescaleDB | NATS

## Mimari
```
apps/web         → Next.js 15 (App Router, TypeScript strict, TanStack Query, Recharts)
apps/api         → .NET 10 Modular Monolith (ASP.NET Core, EF Core, MediatR, FluentValidation)
engine/
  core           → Go load engine library (VU lifecycle, ramp-up, rate limiter, metrics)
  protocols/     → http runner
  cmd/cli/       → loadforge run/validate/report
  cmd/worker/    → NATS consumer + engine runner
services/
  orchestrator   → .NET Worker Service (job scheduling, shard generation, NATS publish)
contracts/
  openapi/       → OpenAPI 3.1.0 spec (loadforge-api.yaml)
  json-schema/   → Senaryo DSL schema (scenario-v1.json)
deploy/
  docker/        → docker-compose.yml, prometheus.yml, grafana provisioning
```

## Teknoloji Kararları
| Alan | Karar |
|------|-------|
| .NET Backend | Modular monolith; Clean Architecture; EF Core + PostgreSQL |
| Go Engine | Goroutine-per-VU; token bucket rate limiter; HdrHistogram metrics |
| Frontend | Next.js App Router; TanStack Query; Monaco Editor; Recharts |
| Veri | PostgreSQL (OLTP) + TimescaleDB hypertable (metrics) |
| Mesajlaşma | NATS JetStream |
| Observability | OpenTelemetry + Prometheus + Grafana |

## Senaryo DSL
YAML tabanlı, `contracts/json-schema/scenario-v1.json` ile doğrulanan format.

## .NET Proje Adlandırma
`LoadForge.*` namespace: Domain, Application, Infrastructure, Persistence, Api, Contracts, Orchestrator.Worker, Tests.Unit, Tests.Integration

## Kod Kuralları
- .NET: async/await zorunlu; CancellationToken her servis metoduna geçmeli
- Go: context.Context her fonksiyona geçmeli; goroutine leak olmamalı
- Frontend: TypeScript strict; `any` kullanılmaz
- DB: Her domain tablosunda `OrganizationId` zorunlu (tenant filtresi)
- Secrets: DB'de plain text yok
- Git: Commit mesajlarına NEXUS ile ilgili hiçbir bilgi yazılmaz
