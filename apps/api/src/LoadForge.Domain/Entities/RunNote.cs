using LoadForge.Domain.Common;

namespace LoadForge.Domain.Entities;

public class RunNote : BaseEntity
{
    public Guid TestRunId { get; set; }
    public TestRun TestRun { get; set; } = default!;
    public Guid OrganizationId { get; set; }
    public Guid AuthorId { get; set; }
    public string Content { get; set; } = string.Empty;
}
