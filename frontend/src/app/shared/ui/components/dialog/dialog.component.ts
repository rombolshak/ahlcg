import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  contentChild,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  Type,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { InputManagerService, LayerRef } from '@services/input-manager.service';
import { AH_DIALOG_CONTENT, DialogContent } from '@shared/components/dialog/dialog.content';
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

  /**
   * Fires whenever the underlying `<dialog>` actually closes — via `close()` below, or any other
   * UA-initiated close. The template also prevents the native `cancel` event (Escape), so
   * `InputManagerService`'s layer stays the single source of truth for what Escape does; this
   * output exists so a caller (`DialogService`) can still be told the element closed regardless
   * of which path caused it.
   */
  public readonly closed = output();

  private readonly inputManager = inject(InputManagerService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly projectedContent = contentChild(AH_DIALOG_CONTENT);
  private readonly contentHost = viewChild('contentHost', { read: ViewContainerRef });
  private dynamicContent: ComponentRef<DialogContent> | undefined;
  private inputLayer: LayerRef | undefined;

  /** Instantiates `type` into the dialog body, replacing content projected via `<ng-content />`. */
  public attachContent<T extends DialogContent>(type: Type<T>): ComponentRef<T> {
    const host = this.contentHost();
    if (!host) throw new Error('Dialog content host is not yet initialized');

    const ref = host.createComponent(type);
    this.dynamicContent = ref;
    return ref;
  }

  public open() {
    this.dialog().nativeElement.showModal();
    this.resolveContent()?.onOpened?.();
    this.inputLayer = this.inputManager.pushLayer({
      cancel: () => {
        this.close();
      },
      ...this.resolveContent()?.getInputHandlers?.(),
    });
  }

  public close() {
    this.dialog().nativeElement.close();
    this.inputLayer?.destroy();
    this.resolveContent()?.onClosed?.();
  }

  ngOnDestroy() {
    if (this.dialog().nativeElement.open) this.close();
  }

  private resolveContent(): DialogContent | undefined {
    return this.dynamicContent?.instance ?? this.projectedContent();
  }
}
