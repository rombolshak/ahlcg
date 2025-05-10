import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardTraitsComponent } from './card-traits.component';
import { cardA, displayOption } from 'shared/domain/test/entities/test-cards';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('CardTraitsComponent', () => {
  let component: CardTraitsComponent;
  let fixture: ComponentFixture<CardTraitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [CardTraitsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTraitsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA.info);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print traits', () => {
    expect(fixture.debugElement.queryAll(By.css('span')).length).toEqual(
      cardA.info.traits?.length ?? 0,
    );

    expect(
      fixture.debugElement.query(By.css('span')).nativeElement.innerText,
    ).toContain(cardA.info.traits?.[0]);
  });
});
