import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFlavorComponent } from './card-flavor.component';
import { cardS } from 'shared/domain/test/test-cards';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('CardFlavorComponent', () => {
  let component: CardFlavorComponent;
  let fixture: ComponentFixture<CardFlavorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [CardFlavorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardFlavorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardS.info);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print flavor', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(1);
    expect(
      fixture.debugElement.query(By.css('p')).nativeElement.innerText,
    ).toContain(cardS.info.flavor);
  });
});
