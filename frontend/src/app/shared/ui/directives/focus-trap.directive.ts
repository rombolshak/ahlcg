import { Directive, ElementRef, inject, OnInit } from '@angular/core';

@Directive({
  selector: '[ahFocusTrap]',
})
export class FocusTrapDirective implements OnInit {
  private readonly element = inject(ElementRef);

  ngOnInit() {
    const input = this.element.nativeElement as HTMLInputElement;
    input.focus();
    input.select();
  }
}
