import {
  ChangeDetectionStrategy,
  Component,
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
  imports: [],
  templateUrl: './numeric-text.component.html',
  host: {
    class: 'font-[Teutonic]',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumericTextComponent implements OnInit {
  public readonly value = input.required<number>();
  public readonly animationCompleted = output();
  private readonly element = inject(ElementRef);
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

      gsap.to(this.element.nativeElement as HTMLElement, {
        keyframes: [
          {
            duration: 0.2,
            color: curr > prev ? 'var(--color-success)' : 'var(--color-error)',
          },
          {
            duration: Math.log1p(diff),
            scale: curr > prev ? 1.2 : 0.8,
          },
          {
            duration: 0.2,
            scale: 1,
            color: 'unset',
          },
        ],

        duration: Math.log1p(diff),
        ease: 'power1.inOut',
        textContent: curr,
        snap: 'textContent',
        onComplete: () => {
          this.animationCompleted.emit();
        },
      });
    });
  }

  ngOnInit() {
    gsap.to(this.element.nativeElement as HTMLElement, {
      textContent: this.value(),
      snap: 'textContent',
    });
  }
}
