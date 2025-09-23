import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { SvgComponent } from '../svg/svg.component';
import { DialogService } from './dialog.service';

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
  public readonly open = input<boolean>(false);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private service = inject(DialogService);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.service.open(this.id());
      } else {
        this.service.close(this.id());
      }
    });
  }

  ngAfterViewInit() {
    const dialog = this.dialog();
    if (dialog) {
      this.service.register(this.id(), dialog);
      if (this.open()) this.service.open(this.id());
    }
  }

  ngOnDestroy() {
    this.service.unregister(this.id());
  }
}
