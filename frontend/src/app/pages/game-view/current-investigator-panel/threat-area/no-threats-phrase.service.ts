import { computed, Injectable, signal, Signal } from '@angular/core';
import { Investigator } from 'shared/domain/entities/investigator.model';

@Injectable({
  providedIn: 'root',
})
export class NoThreatsPhraseService {
  private readonly initialPhrasesCount = 12;
  private readonly totalPhrasesCount = 25;

  private phraseSignals = new Map<
    string,
    ReturnType<typeof this.createPhraseSignal>
  >();

  private createPhraseSignal(investigator: Signal<Investigator | null>) {
    let currentPhrase = this.getRandomPhrase(this.initialPhrasesCount);
    let previousCount = investigator()?.threatArea.length ?? 0;

    return computed(() => {
      const currentCount = investigator()?.threatArea.length ?? 0;
      if (previousCount > 0 && currentCount === 0) {
        currentPhrase = this.getRandomPhrase(this.totalPhrasesCount);
      }

      previousCount = currentCount;
      return currentPhrase;
    });
  }

  getPhrase(investigator: Signal<Investigator | null>) {
    const gator = investigator();
    const defaultText = signal('');
    if (gator == null) {
      return defaultText;
    }

    if (!this.phraseSignals.has(gator.id)) {
      const phraseSignal = this.createPhraseSignal(investigator);
      this.phraseSignals.set(gator.id, phraseSignal);
    }

    // eslint-disable-next-line @angular-eslint/no-uncalled-signals
    return this.phraseSignals.get(gator.id) ?? defaultText;
  }

  private getRandomPhrase(bound: number): string {
    const index = Math.floor(Math.random() * bound + 1);
    return `current_investigator_panel.threat_area.no_threats.${index.toString()}`;
  }
}
