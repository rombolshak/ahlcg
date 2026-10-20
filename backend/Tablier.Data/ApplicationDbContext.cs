using System.Text.Json;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Tablier.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<AppUser>(options)
{
    public DbSet<Game> Games => Set<Game>();
    public DbSet<GameMember> GameMembers => Set<GameMember>();
    public DbSet<GameStep> GameSteps => Set<GameStep>();
    public DbSet<GameSnapshot> GameSnapshots => Set<GameSnapshot>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); // required — Identity's own model config lives here
        builder.Entity<Game>(game =>
        {
            HasJsonbConversion(game.Property(g => g.Configuration));
            game.Property(g => g.IntendedPlayersCount).HasDefaultValue(1);
            game.HasIndex(g => new { g.OwnerId, g.IdempotencyKey }).IsUnique();
            game.HasOne(g => g.Owner).WithMany().HasForeignKey(g => g.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<GameMember>(member =>
        {
            member.HasKey(m => new { m.GameId, m.UserId });
            member.HasOne(m => m.Game).WithMany(g => g.Members).HasForeignKey(m => m.GameId)
                .OnDelete(DeleteBehavior.Cascade);
            member.HasOne(m => m.User).WithMany(u => u.Memberships).HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<GameStep>(step =>
        {
            step.HasKey(s => new { s.GameId, s.Version });
            HasJsonbConversion(step.Property(s => s.Patch));
            step.HasOne<Game>().WithMany().HasForeignKey(s => s.GameId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<GameSnapshot>(snapshot =>
        {
            snapshot.HasKey(s => new { s.GameId, s.Version });
            HasJsonbConversion(snapshot.Property(s => s.State));
            snapshot.HasOne<Game>().WithMany().HasForeignKey(s => s.GameId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static PropertyBuilder<JsonDocument> HasJsonbConversion(PropertyBuilder<JsonDocument> property) =>
        property
            .HasConversion(
                document => document.RootElement.GetRawText(),
                json => JsonDocument.Parse(json, default))
            .HasColumnType("jsonb");
}