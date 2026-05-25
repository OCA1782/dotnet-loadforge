namespace LoadForge.Application.Common.Interfaces;

public interface IRunOrchestratorService
{
    Task DispatchRunAsync(Guid testRunId, CancellationToken cancellationToken = default);
    Task CancelRunAsync(Guid testRunId, CancellationToken cancellationToken = default);
}
