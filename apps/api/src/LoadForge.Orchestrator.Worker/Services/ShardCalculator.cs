namespace LoadForge.Orchestrator.Worker.Services;

public class ShardCalculator
{
    private readonly int _maxShards;

    public ShardCalculator(IConfiguration config)
    {
        _maxShards = config.GetValue("Orchestrator:MaxShards", 4);
    }

    public int ComputeShardCount(int virtualUsers)
        => Math.Max(1, Math.Min(virtualUsers, _maxShards));

    public int AllocateVU(int total, int count, int index)
    {
        int perShard = total / count;
        return index == count - 1 ? perShard + total % count : perShard;
    }

    public int? AllocateRps(int? total, int count, int index)
    {
        if (total is null) return null;
        int perShard = total.Value / count;
        return index == count - 1 ? perShard + total.Value % count : perShard;
    }
}
