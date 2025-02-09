import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDetailsTextComponent } from './card-details-text.component';
import { testLocation, testLocation2 } from 'shared/domain/test/test-locations';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('CardDetailsTextComponent', () => {
  let component: CardDetailsTextComponent;
  let fixture: ComponentFixture<CardDetailsTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [CardDetailsTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardDetailsTextComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', testLocation);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display card title', () => {
    const title = fixture.debugElement.query(By.css('[data-testId=title]'))
      .nativeElement as HTMLElement;

    expect(title.textContent?.trim()).toEqual(testLocation.title);
  });

  it('should display card subtitle if exists', async () => {
    fixture.componentRef.setInput('card', testLocation2);
    await fixture.whenStable();
    const subtitle = fixture.debugElement.query(
      By.css('[data-testId=subtitle]'),
    ).nativeElement as HTMLElement;

    expect(subtitle.textContent?.trim()).toEqual(testLocation2.subtitle ?? '');
  });

  it('should not display subtitle if empty', () => {
    const subtitle = fixture.debugElement.queryAll(
      By.css('[data-testId=subtitle]'),
    );

    expect(subtitle.length).toBe(0);
  });

  it('should display card traits', () => {
    const traits = fixture.debugElement.query(By.css('[data-testId=traits]'))
      .nativeElement as HTMLElement;

    for (const trait of testLocation.traits) {
      expect(traits.textContent?.trim()).toContain(trait.displayValue);
    }
  });

  it('should display card abilities', () => {
    const abilities = fixture.debugElement.queryAll(
      By.css('[data-testId=ability]'),
    );

    expect(abilities.length).toEqual(testLocation.abilities.length);
  });

  it('should not display title', async () => {
    fixture.componentRef.setInput('showTitle', false);
    await fixture.whenStable();

    const title = fixture.debugElement.queryAll(By.css('[data-testId=title]'));

    expect(title.length).toBe(0);
  });
});
