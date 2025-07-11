import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardDetailsTextComponent } from './card-details-text.component';
import { testLocation } from 'shared/domain/test/entities/test-locations';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorS } from '../../../../shared/domain/test/entities/test-investigators';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('CardDetailsTextComponent', () => {
  let component: CardDetailsTextComponent;
  let fixture: ComponentFixture<CardDetailsTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardDetailsTextComponent, getTranslocoModule()],
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

    expect(title.textContent?.trim()).toEqual('Вход в музей');
  });

  it('should display card subtitle if exists', async () => {
    fixture.componentRef.setInput('card', InvestigatorS);
    await fixture.whenStable();
    const subtitle = fixture.debugElement.query(
      By.css('[data-testId=subtitle]'),
    ).nativeElement as HTMLElement;

    expect(subtitle.textContent?.trim()).toEqual('The Librarian');
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

    for (const trait of ['Arkham', 'Ritual']) {
      expect(traits.textContent?.trim()).toContain(trait);
    }
  });

  it('should display card abilities', () => {
    const abilities = fixture.debugElement.queryAll(
      By.css('[data-testId=ability]'),
    );

    expect(abilities.length).toEqual(2);
  });

  it('should not display title', async () => {
    fixture.componentRef.setInput('showTitle', false);
    await fixture.whenStable();

    const title = fixture.debugElement.queryAll(By.css('[data-testId=title]'));

    expect(title.length).toBe(0);
  });
});
