using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;

namespace LoadForge.Application.Common.Interfaces;

public interface IJwtService
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user, Guid organizationId, UserRole role);
    bool ValidateToken(string token, out Guid userId, out Guid organizationId);
}
