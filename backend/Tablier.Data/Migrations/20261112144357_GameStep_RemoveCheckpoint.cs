using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tablier.Data.Migrations
{
    /// <inheritdoc />
    public partial class GameStep_RemoveCheckpoint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Checkpoint",
                table: "GameSteps");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Checkpoint",
                table: "GameSteps",
                type: "text",
                nullable: true);
            migrationBuilder.Sql("""UPDATE "GameSteps" SET "Checkpoint" = "Checkpoints"[1];""");
        }
    }
}
