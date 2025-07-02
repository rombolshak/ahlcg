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
import { SvgComponent } from '../svg/svg.component';

@Component({
  selector: 'ah-dialog',
  imports: [SvgComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements AfterViewInit, OnDestroy {
  public readonly id = input.required<string>();
  public readonly title = input<string>('');
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
