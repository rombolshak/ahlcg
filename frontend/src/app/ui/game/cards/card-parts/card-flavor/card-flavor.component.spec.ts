import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';
import { CardFlavorComponent } from './card-flavor.component';

describe('CardFlavorComponent', () => {
  let component: CardFlavorComponent;
  let fixture: ComponentFixture<CardFlavorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [CardFlavorComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardFlavorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', { flavor: 'Test flavor' });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print flavor', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(1);
    expect(fixture.debugElement.query(By.css('p')).nativeElement.innerText).toContain('Test flavor');
  });
});
