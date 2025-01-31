import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardCostComponent } from './card-cost.component';
import { cardA } from 'shared/domain/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardCostComponent', () => {
  let component: CardCostComponent;
  let fixture: ComponentFixture<CardCostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardCostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardCostComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.detectChanges();
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
