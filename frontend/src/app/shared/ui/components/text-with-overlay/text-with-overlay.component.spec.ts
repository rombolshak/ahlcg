import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextWithOverlayComponent } from './text-with-overlay.component';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';

describe('TextWithOverlayComponent', () => {
  let component: TextWithOverlayComponent;
  let fixture: ComponentFixture<TextWithOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TextWithOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextWithOverlayComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'test');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a text with overlay', () => {
    const p = fixture.debugElement.queryAll(By.css('p'));

    expect(p.length).toBe(2);
    expect((p[0]?.nativeElement as HTMLElement).textContent?.trim()).toBe(
      'test',
    );

    expect((p[1]?.nativeElement as HTMLElement).textContent?.trim()).toBe(
      'test',
    );
  });
});
