using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tablier.Data.Migrations
{
    /// <inheritdoc />
    public partial class GameStep_AddRestoredVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RestoredVersion",
                table: "GameSteps",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RestoredVersion",
                table: "GameSteps");
        }
    }
}
