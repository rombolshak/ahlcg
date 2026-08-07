using System.Text.Json;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Ahlcg.ApiService;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Game> Games => Set<Game>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // required — Identity's own model config lives here
        builder.Entity<Game>(game =>
        {
            game.Property(g => g.Configuration)
                .HasConversion(
                    document => document.RootElement.GetRawText(),
                    json => JsonDocument.Parse(json, default))
                .HasColumnType("jsonb");
            game.HasIndex(g => new { g.OwnerId, g.IdempotencyKey }).IsUnique();
            game.HasOne(g => g.Owner).WithMany().HasForeignKey(g => g.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}