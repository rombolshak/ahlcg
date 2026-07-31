import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { defaultSlots } from '@domain/test/entities/test-investigators';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { ControlAreaComponent } from './control-area.component';

describe('ControlAreaComponent', () => {
  let component: ControlAreaComponent;
  let fixture: ComponentFixture<ControlAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [ControlAreaComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlAreaComponent);
    component = fixture.componentInstance;
    Object.defineProperty(fixture.debugElement.nativeElement, 'offsetHeight', {
      value: 160,
      configurable: true,
    });
    fixture.componentRef.setInput('assets', []);
    fixture.componentRef.setInput('faction', 'mystic');
    fixture.componentRef.setInput('maxSlotsCounts', defaultSlots);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
