import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardTitleComponent } from './card-title.component';
import { cardA, displayOption } from '../../models/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardTitleComponent', () => {
  let component: CardTitleComponent;
  let fixture: ComponentFixture<CardTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardTitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print title', () => {
    expect(fixture.debugElement.queryAll(By.css('div')).length).toEqual(1);
    expect(
      fixture.debugElement.query(By.css('div')).nativeElement.innerText,
    ).toContain(cardA.title);
  });
});
