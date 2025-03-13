import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Agenda } from 'shared/domain/agenda.model';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { CardDetailsTextComponent } from '../../components/card-details-text/card-details-text.component';

@Component({
  selector: 'ah-agenda',
  imports: [NgOptimizedImage, NgClass, CardDetailsTextComponent],
  templateUrl: './agenda.component.html',
  host: {
    class:
      'relative flex flex-col w-full items-center p-2 outline outline-2 rounded bg-radial-[at_50%_5%] to-90%',
    '[class]': 'hostClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaComponent {
  readonly agenda = input.required<Agenda>();
  protected readonly imageService = inject(ImagesUrlService);
  protected readonly emptyDoomSlots = computed(() =>
    Math.max(
      this.agenda().requiredDoom -
        this.agenda().currentDoom -
        this.agenda().doomOnCards,
      0,
    ),
  );

  protected readonly emptySlotsRatio = computed(
    () => this.emptyDoomSlots() / this.agenda().requiredDoom,
  );

  protected readonly hostClasses = computed(() => ({
    'from-slate-600/80': this.emptySlotsRatio() >= 0.8,
    'to-slate-800/70': this.emptySlotsRatio() >= 0.8,
    'outline-slate-700': this.emptySlotsRatio() >= 0.8,
    'from-yellow-600/80':
      this.emptySlotsRatio() >= 0.6 && this.emptySlotsRatio() < 0.8,
    'to-yellow-800/70':
      this.emptySlotsRatio() >= 0.6 && this.emptySlotsRatio() < 0.8,
    'outline-yellow-700':
      this.emptySlotsRatio() >= 0.6 && this.emptySlotsRatio() < 0.8,
    'from-amber-600/80':
      this.emptySlotsRatio() >= 0.4 && this.emptySlotsRatio() < 0.6,
    'to-amber-800/70':
      this.emptySlotsRatio() >= 0.4 && this.emptySlotsRatio() < 0.6,
    'outline-amber-700':
      this.emptySlotsRatio() >= 0.4 && this.emptySlotsRatio() < 0.6,
    'from-orange-600/80':
      this.emptySlotsRatio() >= 0.2 && this.emptySlotsRatio() < 0.4,
    'to-orange-800/70':
      this.emptySlotsRatio() >= 0.2 && this.emptySlotsRatio() < 0.4,
    'outline-orange-700':
      this.emptySlotsRatio() >= 0.2 && this.emptySlotsRatio() < 0.4,
    'from-red-600/80': this.emptySlotsRatio() < 0.2,
    'to-red-800/70': this.emptySlotsRatio() < 0.2,
    'outline-red-700': this.emptySlotsRatio() < 0.2,
  }));
}
