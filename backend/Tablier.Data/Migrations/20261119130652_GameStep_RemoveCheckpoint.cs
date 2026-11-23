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

            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM "GameSteps" WHERE cardinality("Checkpoints") > 1) THEN
                        RAISE EXCEPTION 'Cannot downgrade multiple checkpoints to a scalar';
                    END IF;
                END $$;
                UPDATE "GameSteps" SET "Checkpoint" = "Checkpoints"[1];
                """);
        }
    }
}
