using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LoadForge.Tests.Integration;

public class AuthIntegrationTests : IClassFixture<LoadForgeWebAppFactory>
{
    private readonly HttpClient _client;

    public AuthIntegrationTests(LoadForgeWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidData_Returns200AndToken()
    {
        var payload = new
        {
            email = "admin@acme.com",
            password = "SecurePass123!",
            organizationName = "Acme Corp"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", payload);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        var payload = new { email = "dup@example.com", password = "SecurePass123!", organizationName = "Org One" };
        await _client.PostAsJsonAsync("/api/auth/register", payload);

        var payload2 = payload with { organizationName = "Org Two" };
        var response = await _client.PostAsJsonAsync("/api/auth/register", payload2);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200AndToken()
    {
        var reg = new { email = "login-test@example.com", password = "SecurePass123!", organizationName = "Login Org" };
        await _client.PostAsJsonAsync("/api/auth/register", reg);

        var login = new { email = reg.email, password = reg.password };
        var response = await _client.PostAsJsonAsync("/api/auth/login", login);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        body!.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var reg = new { email = "wrong-pw@example.com", password = "SecurePass123!", organizationName = "Wrong PW Org" };
        await _client.PostAsJsonAsync("/api/auth/register", reg);

        var login = new { email = reg.email, password = "WrongPassword!" };
        var response = await _client.PostAsJsonAsync("/api/auth/login", login);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetTestRun_Unauthenticated_Returns401()
    {
        var response = await _client.GetAsync($"/api/test-runs/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetScenarios_Authenticated_ReturnsEmptyList()
    {
        var reg = new { email = "scenlist@example.com", password = "SecurePass123!", organizationName = "ScenList Org" };
        var regResp = await _client.PostAsJsonAsync("/api/auth/register", reg);
        var auth = await regResp.Content.ReadFromJsonAsync<AuthResponseDto>();

        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);

        var response = await _client.GetAsync("/api/scenarios");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<object>>();
        body.Should().NotBeNull();
        body.Should().BeEmpty();
    }

    private record AuthResponseDto(string Token, DateTime ExpiresAt);
}
