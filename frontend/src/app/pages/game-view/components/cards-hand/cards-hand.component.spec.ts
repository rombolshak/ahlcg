import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardE, cardS } from 'shared/domain/test/entities/test-cards';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { CardsHandComponent } from './cards-hand.component';

describe('CardsHandComponent', () => {
  let component: CardsHandComponent;
  let fixture: ComponentFixture<CardsHandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [CardsHandComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsHandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', [cardA, cardS, cardE]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all cards', () => {
    expect(fixture.debugElement.queryAll(By.css('ah-card')).length).toBe(3);
  });

  it('should display nothing', async () => {
    fixture = TestBed.createComponent(CardsHandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', []);
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('ah-card')).length).toBe(0);
  });
});
