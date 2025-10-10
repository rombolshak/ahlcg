import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AssetSlot } from 'shared/domain/entities/player-card.model';
import { EmptySlotComponent } from './empty-slot/empty-slot.component';

@Component({
  selector: 'ah-empty-slots-list',
  imports: [EmptySlotComponent],
  templateUrl: './empty-slots-list.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptySlotsListComponent {
  readonly slots = input.required<AssetSlot[]>();

  protected readonly emptyColumnsCount = computed(() =>
    Math.max(this.slots().length, 6),
  );
}
