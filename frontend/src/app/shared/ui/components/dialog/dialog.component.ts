import { ChangeDetectionStrategy, Component, contentChild, ElementRef, inject, input, OnDestroy, viewChild } from '@angular/core';
import { InputManagerService } from '@services/input-manager.service';
import { AH_DIALOG_CONTENT } from '@shared/components/dialog/dialog.content';
import { AH_DIALOG_CONTEXT } from '@shared/components/dialog/dialog.context';
import { SvgComponent } from '../svg/svg.component';

@Component({
  selector: 'ah-dialog',
  imports: [SvgComponent],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.css',
  providers: [
    {
      provide: AH_DIALOG_CONTEXT,
      useExisting: DialogComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogComponent implements OnDestroy {
  public readonly title = input('');
  public readonly isOpen = input(false);

  private readonly inputManager = inject(InputManagerService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly content = contentChild.required(AH_DIALOG_CONTENT);

  public open() {
    this.dialog().nativeElement.showModal();
    this.content().onOpened?.();
    this.inputManager.pushLayer({
      cancel: () => {
        this.close();
      },
      ...this.content().getInputHandlers?.(),
    });
  }

  public close() {
    this.dialog().nativeElement.close();
    this.inputManager.popLayer();
    this.content().onClosed?.();
  }

  ngOnDestroy() {
    if (this.dialog().nativeElement.open) this.close();
  }
}
