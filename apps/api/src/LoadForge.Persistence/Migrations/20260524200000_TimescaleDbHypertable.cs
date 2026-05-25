using LoadForge.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoadForge.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260524200000_TimescaleDbHypertable")]
    public partial class TimescaleDbHypertable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable TimescaleDB extension (requires timescaledb image — already used in docker-compose)
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");

            // Convert MetricSnapshots to a TimescaleDB hypertable partitioned by Timestamp.
            // migrate_data: TRUE copies existing rows into the hypertable chunks.
            migrationBuilder.Sql("""
                SELECT create_hypertable(
                    '"MetricSnapshots"',
                    by_range('"Timestamp"'),
                    if_not_exists => TRUE,
                    migrate_data => TRUE
                );
                """);

            // Composite index for run-scoped time-ordered queries (most common access pattern)
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_MetricSnapshots_RunId_Timestamp"
                ON "MetricSnapshots" ("TestRunId", "Timestamp" DESC);
                """);

            // Convert RequestMetrics similarly for per-step latency queries
            migrationBuilder.Sql("""
                SELECT create_hypertable(
                    '"RequestMetrics"',
                    by_range('"CreatedAt"'),
                    if_not_exists => TRUE,
                    migrate_data => TRUE
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Hypertable conversion is irreversible without data loss;
            // drop the custom index only.
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_MetricSnapshots_RunId_Timestamp";""");
        }
    }
}
