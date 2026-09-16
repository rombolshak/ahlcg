import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameSummary } from '@features/games/games.service';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'ah-case-file-card',
  imports: [TranslocoDirective],
  templateUrl: './case-file-card.component.html',
  styles: '.active { @apply bg-[oklch(0.74_0.14_70)] text-[oklch(0.20_0.03_80)] }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block cursor-reset',
  },
})
export class CaseFileCardComponent {
  private readonly transloco = inject(TranslocoService);

  public readonly game = input.required<GameSummary>();
  public readonly active = input(false);

  private readonly lang = toSignal(this.transloco.langChanges$);

  protected readonly openedAt = computed(() => this.formatDate(this.game().createdAt, { dateStyle: 'medium' }));
  protected readonly lastPlayedAt = computed(() => this.formatDate(this.game().lastPlayedAt, { dateStyle: 'medium', timeStyle: 'short' }));

  private formatDate(date: Date, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.lang() ?? 'en', options).format(date);
  }
}
