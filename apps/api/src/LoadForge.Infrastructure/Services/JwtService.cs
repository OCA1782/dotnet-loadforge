using LoadForge.Application.Common.Interfaces;
using LoadForge.Domain.Entities;
using LoadForge.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LoadForge.Infrastructure.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config) => _config = config;

    public (string Token, DateTime ExpiresAt) GenerateToken(User user, Guid organizationId, UserRole role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddHours(double.Parse(_config["Jwt:ExpiresHours"] ?? "24"));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("org_id", organizationId.ToString()),
            new Claim("role", ((int)role).ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public bool ValidateToken(string token, out Guid userId, out Guid organizationId)
    {
        userId = Guid.Empty;
        organizationId = Guid.Empty;

        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!);

            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = true
            }, out _);

            userId = Guid.Parse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
            organizationId = Guid.Parse(principal.FindFirstValue("org_id")!);
            return true;
        }
        catch { return false; }
    }
}
