import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardCopyrightComponent } from './card-copyright.component';
import { cardA, displayOption } from 'shared/domain/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardCopyrightComponent', () => {
  let component: CardCopyrightComponent;
  let fixture: ComponentFixture<CardCopyrightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardCopyrightComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardCopyrightComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print copyright', () => {
    expect(fixture.debugElement.queryAll(By.css('span')).length).toEqual(3);
    expect(
      fixture.debugElement.query(By.css('span:nth-child(2)')).nativeElement
        .innerText,
    ).toContain('FFG');
  });
});
