using LoadForge.Domain.Enums;

namespace LoadForge.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? OrganizationId { get; }
    bool IsAuthenticated { get; }
    UserRole? Role { get; }
}
