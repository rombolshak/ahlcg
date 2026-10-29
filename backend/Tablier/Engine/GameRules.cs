using Tablier.Contract;

namespace Tablier.Engine;

#pragma warning disable S2436
public sealed record GameRules<TConfiguration, TState, TView>(
    IGameConfigurator<TConfiguration, TState> Configurator,
    IGameStateProcessor<TState> Processor,
    IGameViewProjector<TState, TView> Projector
);
#pragma warning restore S2436
