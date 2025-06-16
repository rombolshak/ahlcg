import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { DialogService } from './dialog.service';

@Component({
  selector: 'ah-dialog',
  imports: [],
  template: `
    <dialog #dialog class="modal">
      <div class="modal-box">
        <ng-content />
      </div>
    </dialog>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements AfterViewInit, OnDestroy {
  public readonly id = input.required<string>();
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private service = inject(DialogService);

  ngAfterViewInit() {
    const dialog = this.dialog();
    if (dialog) {
      this.service.register(this.id(), dialog);
    }
  }

  ngOnDestroy() {
    this.service.unregister(this.id());
  }
}
