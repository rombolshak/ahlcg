using Microsoft.AspNetCore.Identity;

namespace Tablier.Data;

public class AppUser : IdentityUser
{
    public bool IsAnonymous { get; set; }
    public ICollection<GameMember> Memberships { get; } = [];
}
