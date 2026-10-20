using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tablier.Data.Migrations
{
    /// <inheritdoc />
    public partial class GameHistory_Add : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameSnapshots",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    State = table.Column<string>(type: "jsonb", nullable: false),
                    SchemaVersion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameSnapshots", x => new { x.GameId, x.Version });
                    table.ForeignKey(
                        name: "FK_GameSnapshots_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GameSteps",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Actor = table.Column<string>(type: "text", nullable: true),
                    Action = table.Column<string>(type: "text", nullable: true),
                    Patch = table.Column<string>(type: "jsonb", nullable: false),
                    Checkpoint = table.Column<string>(type: "text", nullable: true),
                    Irreversible = table.Column<bool>(type: "boolean", nullable: false),
                    Baseline = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameSteps", x => new { x.GameId, x.Version });
                    table.ForeignKey(
                        name: "FK_GameSteps_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameSnapshots");

            migrationBuilder.DropTable(
                name: "GameSteps");
        }
    }
}
