namespace Tablier.Contract;

public interface ISchemaVersioned
{
    int SchemaVersion { get; }
}
