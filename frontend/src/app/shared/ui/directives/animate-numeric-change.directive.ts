import {
  computed,
  Directive,
  effect,
  ElementRef,
  input,
  OnDestroy,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { pairwise } from 'rxjs';

@Directive({
  selector: '[ahAnimateNumericChange]',
})
export class AnimateNumericChangeDirective implements OnDestroy {
  public readonly ahAnimateNumericChange = input.required<number>();
  public readonly incrementAnimation = input('ah-increment');
  public readonly decrementAnimation = input('ah-decrement');

  private readonly incrementClass = computed(
    () => `animate-${this.incrementAnimation()}`,
  );
  private readonly decrementClass = computed(
    () => `animate-${this.decrementAnimation()}`,
  );

  private readonly changes = toSignal(
    toObservable(this.ahAnimateNumericChange).pipe(pairwise()),
  );

  constructor(private readonly el: ElementRef) {
    const element = el.nativeElement as HTMLElement;
    element.addEventListener('animationend', this.onAnimationEnd.bind(this));

    effect(() => {
      const change = this.changes();
      if (change) {
        const [prev, curr] = change;
        if (prev < curr) {
          element.classList.add(this.incrementClass());
        }

        element.classList.add(this.decrementClass());
      }
    });
  }

  ngOnDestroy() {
    const element = this.el.nativeElement as HTMLElement;
    element.removeEventListener('animationend', this.onAnimationEnd.bind(this));
  }

  private onAnimationEnd(
    this: AnimateNumericChangeDirective,
    ev: AnimationEvent,
  ) {
    if (
      ev.animationName === this.incrementAnimation() ||
      ev.animationName === this.decrementAnimation()
    ) {
      (this.el.nativeElement as HTMLElement).classList.remove(
        this.incrementClass(),
        this.decrementClass(),
      );
    }
  }
}
