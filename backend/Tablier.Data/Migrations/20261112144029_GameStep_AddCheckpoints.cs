using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tablier.Data.Migrations
{
    /// <inheritdoc />
    public partial class GameStep_AddCheckpoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string[]>(
                name: "Checkpoints",
                table: "GameSteps",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);
            migrationBuilder.Sql("""
                UPDATE "GameSteps"
                SET "Checkpoints" = CASE WHEN "Checkpoint" IS NULL THEN ARRAY[]::text[] ELSE ARRAY["Checkpoint"] END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Checkpoints",
                table: "GameSteps");
        }
    }
}
