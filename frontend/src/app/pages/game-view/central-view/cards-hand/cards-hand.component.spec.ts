import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsHandComponent } from './cards-hand.component';
import { cardA, cardE, cardS } from 'shared/domain/test/entities/test-cards';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('CardsHandComponent', () => {
  let component: CardsHandComponent;
  let fixture: ComponentFixture<CardsHandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardsHandComponent, NoopAnimationsModule, getTranslocoModule()],
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
