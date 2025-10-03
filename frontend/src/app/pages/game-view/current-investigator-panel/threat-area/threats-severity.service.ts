import { computed, Injectable, signal, Signal } from '@angular/core';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { Investigator } from 'shared/domain/entities/investigator.model';
import { AssetCard } from 'shared/domain/entities/player-card.model';

export interface ThreatsSeverity {
  healthSeverity: number;
  sanitySeverity: number;
}

@Injectable({
  providedIn: 'root',
})
export class ThreatsSeverityService {
  private readonly investigatorsSignals = new Map<
    string,
    ReturnType<typeof this.calculate>
  >();

  getThreatsSeverity(
    investigator: Signal<
      (Investigator & { assets: AssetCard[]; threats: Enemy[] }) | null
    >,
  ): Signal<ThreatsSeverity> {
    const gator = investigator();
    const defaultValue = signal({ healthSeverity: 0, sanitySeverity: 0 });
    if (gator == null) {
      return defaultValue;
    }

    if (!this.investigatorsSignals.has(gator.id)) {
      this.investigatorsSignals.set(gator.id, this.calculate(investigator));
    }

    // eslint-disable-next-line @angular-eslint/no-uncalled-signals
    return this.investigatorsSignals.get(gator.id) ?? defaultValue;
  }

  private calculate(
    investigator: Signal<
      (Investigator & { assets: AssetCard[]; threats: Enemy[] }) | null
    >,
  ) {
    return computed(() => {
      const gator = investigator();
      if (gator == null) return { healthSeverity: 0, sanitySeverity: 0 };

      const totalHealth =
        gator.health.max + this.calcAssets(gator.assets, (a) => a.health?.max);
      const totalSanity =
        gator.sanity.max + this.calcAssets(gator.assets, (a) => a.sanity?.max);

      const currentDamage =
        gator.health.damaged +
        this.calcAssets(gator.assets, (a) => a.health?.damaged);
      const currentHorror =
        gator.sanity.damaged +
        this.calcAssets(gator.assets, (a) => a.sanity?.damaged);

      const incomingDamage = gator.threats.reduce(
        (acc, threat) => acc + threat.damageAttack,
        0,
      );
      const incomingHorror = gator.threats.reduce(
        (acc, threat) => acc + threat.horrorAttack,
        0,
      );

      const healthSeverity = Math.min(
        1,
        incomingDamage === 0
          ? 0
          : (currentDamage + incomingDamage) / totalHealth,
      );
      const sanitySeverity = Math.min(
        1,
        incomingHorror === 0
          ? 0
          : (currentHorror + incomingHorror) / totalSanity,
      );

      return { healthSeverity, sanitySeverity };
    });
  }

  private calcAssets(
    assets: AssetCard[],
    selector: (asset: AssetCard) => number | undefined,
  ): number {
    return assets.reduce((acc, asset) => acc + (selector(asset) ?? 0), 0);
  }
}
