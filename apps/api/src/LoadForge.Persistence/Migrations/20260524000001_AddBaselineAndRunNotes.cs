using System;
using LoadForge.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoadForge.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260524000001_AddBaselineAndRunNotes")]
    public partial class AddBaselineAndRunNotes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBaseline",
                table: "TestRuns",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "RunNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TestRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RunNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RunNotes_TestRuns_TestRunId",
                        column: x => x.TestRunId,
                        principalTable: "TestRuns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RunNotes_TestRunId",
                table: "RunNotes",
                column: "TestRunId");

            migrationBuilder.CreateIndex(
                name: "IX_TestRuns_ScenarioId_IsBaseline",
                table: "TestRuns",
                columns: new[] { "ScenarioId", "IsBaseline" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RunNotes");
            migrationBuilder.DropIndex(name: "IX_TestRuns_ScenarioId_IsBaseline", table: "TestRuns");
            migrationBuilder.DropColumn(name: "IsBaseline", table: "TestRuns");
        }
    }
}
