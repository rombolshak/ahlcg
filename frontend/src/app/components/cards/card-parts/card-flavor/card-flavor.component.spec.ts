import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFlavorComponent } from './card-flavor.component';
import { cardS } from 'models/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardFlavorComponent', () => {
  let component: CardFlavorComponent;
  let fixture: ComponentFixture<CardFlavorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardFlavorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardFlavorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardS);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print flavor', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(1);
    expect(
      fixture.debugElement.query(By.css('p')).nativeElement.innerText,
    ).toContain(cardS.flavor);
  });
});
