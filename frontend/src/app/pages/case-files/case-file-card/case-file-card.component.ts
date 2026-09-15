import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameSummary } from '@features/games/games.service';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'ah-case-file-card',
  imports: [TranslocoDirective],
  templateUrl: './case-file-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class CaseFileCardComponent {
  private readonly transloco = inject(TranslocoService);

  public readonly game = input.required<GameSummary>();
  public readonly active = input(false);

  private readonly lang = toSignal(this.transloco.langChanges$);

  protected readonly openedAt = computed(() => this.formatDate(this.game().createdAt));
  protected readonly lastPlayedAt = computed(() => this.formatDate(this.game().lastPlayedAt));

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.lang() ?? 'en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}
