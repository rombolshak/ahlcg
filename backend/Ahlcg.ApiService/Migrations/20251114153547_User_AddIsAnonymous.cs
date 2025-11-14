using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ahlcg.ApiService.Migrations
{
    /// <inheritdoc />
    public partial class User_AddIsAnonymous : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAnonymous",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAnonymous",
                table: "AspNetUsers");
        }
    }
}
