import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  computed,
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

export type DialogSize = 's' | 'm' | 'l';

/**
 * The whole class list of the box per size, not just the size-dependent part: a `[class]` binding
 * alongside a static `class` attribute is a lint error, so the binding owns all of it. Written out
 * in full rather than composed from fragments — Tailwind only emits classes spelled out in source.
 *
 * Width and padding override daisyUI's `modal-box` defaults (32rem wide, 1.5rem all round). `s` is
 * daisyUI's own width and reproduces the padding the dialog had before sizes existed — 1.5rem from
 * `modal-box` plus the 1rem the body used to carry itself. `m` and `l` pad by their own rule: a
 * half-height top, so the engraved border across the top stays close to the title.
 */
const SIZE_CLASSES: Record<DialogSize, string> = {
  s: 'modal-box min-h-40 text-primary-content w-11/12 max-w-[32rem] px-18 pt-5 pb-8',
  m: 'modal-box min-h-40 text-primary-content w-11/12 max-w-[48rem] px-24 pt-6 pb-14',
  l: 'modal-box min-h-40 text-primary-content w-11/12 max-w-[64rem] px-30 pt-8 pb-17',
};

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
  public readonly size = input<DialogSize>('s');

  protected readonly boxClasses = computed(() => SIZE_CLASSES[this.size()]);

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
    const element = this.dialog().nativeElement;
    element.showModal();
    this.resolveContent()?.onOpened?.();

    // `onOpened` can resolve the dialog outright — content that already knows its answer emits
    // its result there, and the caller tears the dialog down synchronously, before this method
    // has returned. Pushing a layer now would put one on top of the stack that nothing owns:
    // `close()` has already run and destroyed the layer that existed at the time, which was
    // none. It would then swallow every input for the rest of the session.
    if (!element.open) return;

    // A provider, not an object: content is free to change what its keys mean while the dialog
    // stays open — `SignInComponent` swaps a whole view, so Escape goes from "start anonymously"
    // to "back to the choice". A snapshot taken here would keep answering for the first view.
    this.inputLayer = this.inputManager.pushLayer(() => ({
      cancel: () => {
        this.close();
      },
      ...this.resolveContent()?.getInputHandlers?.(),
    }));
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
