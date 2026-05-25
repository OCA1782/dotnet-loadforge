using System;
using LoadForge.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoadForge.Persistence.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260524000002_AddWebhooks")]
    public partial class AddWebhooks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Webhooks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Events = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Secret = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Webhooks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Webhooks_OrganizationId",
                table: "Webhooks",
                column: "OrganizationId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Webhooks");
        }
    }
}
