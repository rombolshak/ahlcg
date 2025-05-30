import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { gsap } from 'gsap';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { pairwise } from 'rxjs';

@Component({
  selector: 'ah-numeric-text',
  template: '{{ value() }}',
  host: {
    class: 'font-[Teutonic]',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumericTextComponent implements OnInit {
  public readonly value = input.required<number>();
  public readonly increaseColor = input('var(--color-success-rgb)');
  public readonly decreaseColor = input('var(--color-error-rgb)');
  public readonly invertColors = input(false);

  public readonly animationCompleted = output();
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly _increaseColor = computed(() =>
    this.invertColors() ? this.decreaseColor() : this.increaseColor(),
  );
  private readonly _decreaseColor = computed(() =>
    this.invertColors() ? this.increaseColor() : this.decreaseColor(),
  );
  private readonly changes = toSignal(
    toObservable(this.value).pipe(pairwise()),
  );

  constructor() {
    effect(() => {
      const changes = this.changes();
      if (!changes) {
        return;
      }

      const [prev, curr] = changes;
      const diff = Math.abs(prev - curr);

      const tl = gsap.timeline();
      tl.to(this.element.nativeElement as HTMLElement, {
        keyframes: [
          {
            duration: 0.1,
            color: curr > prev ? this._increaseColor() : this._decreaseColor(),
          },
          {
            duration: Math.log1p(diff) / 2,
            scale: curr > prev ? 1.2 : 0.8,
          },
        ],
        repeat: 1,
        yoyo: true,
      }).to(
        this.element.nativeElement as HTMLElement,
        {
          duration: Math.log1p(diff),
          ease: 'power1.inOut',
          textContent: curr,
          snap: 'textContent',
          onComplete: () => {
            this.animationCompleted.emit();
          },
        },
        '<',
      );
    });
  }

  ngOnInit() {
    gsap.to(this.element.nativeElement as HTMLElement, {
      textContent: this.value(),
      snap: 'textContent',
    });
  }
}
