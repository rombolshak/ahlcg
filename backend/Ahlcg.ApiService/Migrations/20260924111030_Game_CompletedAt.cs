using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ahlcg.ApiService.Migrations
{
    /// <inheritdoc />
    public partial class Game_CompletedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CompletedAt",
                table: "Games",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "Games");
        }
    }
}
