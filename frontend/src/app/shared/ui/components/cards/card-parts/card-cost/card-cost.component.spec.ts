import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { CardCostComponent } from './card-cost.component';

describe('CardCostComponent', () => {
  let component: CardCostComponent;
  let fixture: ComponentFixture<CardCostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CardCostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardCostComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print cost', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-text-with-overlay')).length,
    ).toEqual(1);

    expect(
      fixture.debugElement.query(By.css('ah-text-with-overlay')).nativeElement
        .innerText,
    ).toContain(cardA.cost);
  });
});
