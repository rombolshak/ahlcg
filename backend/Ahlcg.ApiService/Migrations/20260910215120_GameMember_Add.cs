using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ahlcg.ApiService.Migrations
{
    /// <inheritdoc />
    public partial class GameMember_Add : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IntendedPlayersCount",
                table: "Games",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "GameMembers",
                columns: table => new
                {
                    GameId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    LastPlayedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameMembers", x => new { x.GameId, x.UserId });
                    table.ForeignKey(
                        name: "FK_GameMembers_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GameMembers_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameMembers_UserId",
                table: "GameMembers",
                column: "UserId");

            migrationBuilder.Sql("""
                INSERT INTO "GameMembers" ("GameId", "UserId", "JoinedAt", "LastPlayedAt")
                SELECT "Id", "OwnerId", "CreatedAt", "LastPlayedAt" FROM "Games";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameMembers");

            migrationBuilder.DropColumn(
                name: "IntendedPlayersCount",
                table: "Games");
        }
    }
}
