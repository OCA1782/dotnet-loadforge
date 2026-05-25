using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace LoadForge.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    public Guid? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("sub");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? OrganizationId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue("org_id");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public UserRole? Role
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue("role");
            return int.TryParse(value, out var r) ? (UserRole)r : null;
        }
    }
}
