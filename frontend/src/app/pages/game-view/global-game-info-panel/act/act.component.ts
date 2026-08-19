import { NgClass, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { imageUrl } from '@domain/card-art/image-url';
import { Act, Objective } from '@domain/entities/act.model';
import { TranslocoDirective } from '@jsverse/transloco';
import { SingleBarComponent } from '@ui/kit/single-bar/single-bar.component';
import { WithAhSymbolsPipe } from '@ui/pipes/with-ah-symbols.pipe';
import { CardDetailsTextComponent } from '../../components/card-details-text/card-details-text.component';

@Component({
  selector: 'ah-act',
  imports: [CardDetailsTextComponent, WithAhSymbolsPipe, NgOptimizedImage, NgClass, SingleBarComponent, TranslocoDirective],
  templateUrl: './act.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex flex-col w-full items-center p-2 outline outline-2 rounded text-accent-content bg-radial-[at_50%_5%] to-90%',
    '[class]': 'hostClasses()',
  },
})
export class ActComponent {
  private readonly cardInfoService = inject(CardInfoService);
  protected readonly imageUrl = imageUrl;

  readonly act = input.required<Act>();

  private readonly cardInfo = this.cardInfoService.getCardInfo(this.act);

  readonly title = computed(() => this.cardInfo()?.title);

  protected readonly emptySlots = computed(() => this.act().objectives.map(o => Math.max(o.requiredValue - o.currentValue, 0)));

  protected readonly maxLines = computed(() =>
    this.act().objectives.map(o => {
      const max = Math.max(o.requiredValue, o.currentValue);
      const multiRowValue = max <= 12 ? 2 : 3;
      return max <= 6 ? 1 : multiRowValue;
    }),
  );

  protected readonly hostClasses = computed(() => {
    const maxProgress = Math.max(...this.act().objectives.map(o => this.calcObjectiveProgress(o)));
    return {
      'from-lime-500/80': maxProgress >= 1,
      'to-lime-700/80': maxProgress >= 1,
      'outline-lime-600': maxProgress >= 1,
      'from-green-500/80': maxProgress >= 0.8 && maxProgress < 1,
      'to-green-700/80': maxProgress >= 0.8 && maxProgress < 1,
      'outline-green-600': maxProgress >= 0.8 && maxProgress < 1,
      'from-emerald-500/80': maxProgress >= 0.6 && maxProgress < 0.8,
      'to-emerald-700/80': maxProgress >= 0.6 && maxProgress < 0.8,
      'outline-emerald-600': maxProgress >= 0.6 && maxProgress < 0.8,
      'from-teal-500/80': maxProgress >= 0.45 && maxProgress < 0.6,
      'to-teal-700/80': maxProgress >= 0.45 && maxProgress < 0.6,
      'outline-teal-600': maxProgress >= 0.45 && maxProgress < 0.6,
      'from-cyan-500/80': maxProgress >= 0.3 && maxProgress < 0.45,
      'to-cyan-700/80': maxProgress >= 0.3 && maxProgress < 0.45,
      'outline-cyan-600': maxProgress >= 0.3 && maxProgress < 0.45,
      'from-sky-500/80': maxProgress >= 0.15 && maxProgress < 0.3,
      'to-sky-700/80': maxProgress >= 0.15 && maxProgress < 0.3,
      'outline-sky-600': maxProgress >= 0.15 && maxProgress < 0.3,
      'from-slate-500/80': maxProgress < 0.15,
      'to-slate-700/80': maxProgress < 0.15,
      'outline-slate-600': maxProgress < 0.15,
    };
  });

  private calcObjectiveProgress(obj: Objective) {
    if (obj.requiredValue !== 0) {
      return obj.currentValue / obj.requiredValue;
    }

    return (obj.startValue - obj.currentValue) / obj.startValue;
  }
}
