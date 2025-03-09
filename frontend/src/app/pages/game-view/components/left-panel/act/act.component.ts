import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Act, Objective } from 'shared/domain/act.model';
import { ImagesUrlService } from '../../../../../shared/services/images-url.service';
import { CardDetailsTextComponent } from '../../card-details-text/card-details-text.component';
import { WithAhSymbolsPipe } from '../../../../../shared/ui/pipes/with-ah-symbols.pipe';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { SingleBarComponent } from '../../../../../shared/ui/components/vitals-bar/single-bar/single-bar.component';

@Component({
  selector: 'ah-act',
  imports: [
    CardDetailsTextComponent,
    WithAhSymbolsPipe,
    NgOptimizedImage,
    NgClass,
    SingleBarComponent,
  ],
  templateUrl: './act.component.html',
  host: {
    class:
      'relative flex flex-col w-full items-center p-2 outline outline-2 rounded text-white',
    '[class]': 'hostClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActComponent {
  readonly act = input.required<Act>();
  protected readonly imageService = inject(ImagesUrlService);

  protected readonly emptySlots = computed(() =>
    this.act().objectives.map((o) =>
      Math.max(o.requiredValue - o.currentValue, 0),
    ),
  );

  protected readonly maxLines = computed(() =>
    this.act().objectives.map((o) => {
      const max = Math.max(o.requiredValue, o.currentValue);
      return max <= 6 ? 1 : max <= 12 ? 2 : 3;
    }),
  );

  protected readonly hostClasses = computed(() => {
    const maxProgress = Math.max(
      ...this.act().objectives.map((o) => this.calcObjectiveProgress(o)),
    );
    return {
      'bg-lime-700/80': maxProgress >= 1,
      'outline-lime-600': maxProgress >= 1,
      'bg-green-700/80': maxProgress >= 0.8 && maxProgress < 1,
      'outline-green-600': maxProgress >= 0.8 && maxProgress < 1,
      'bg-emerald-700/80': maxProgress >= 0.6 && maxProgress < 0.8,
      'outline-emerald-600': maxProgress >= 0.6 && maxProgress < 0.8,
      'bg-teal-700/80': maxProgress >= 0.45 && maxProgress < 0.6,
      'outline-teal-600': maxProgress >= 0.45 && maxProgress < 0.6,
      'bg-cyan-700/80': maxProgress >= 0.3 && maxProgress < 0.45,
      'outline-cyan-600': maxProgress >= 0.3 && maxProgress < 0.45,
      'bg-sky-700/80': maxProgress >= 0.15 && maxProgress < 0.3,
      'outline-sky-600': maxProgress >= 0.15 && maxProgress < 0.3,
      'bg-slate-700/80': maxProgress < 0.15,
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
