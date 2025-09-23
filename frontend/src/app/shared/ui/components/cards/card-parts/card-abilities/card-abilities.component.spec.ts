import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { displayOption } from 'shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../domain/test/transloco.testing';
import { CardAbilitiesComponent } from './card-abilities.component';

describe('CardAbilityComponent', () => {
  let component: CardAbilitiesComponent;
  let fixture: ComponentFixture<CardAbilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
      imports: [CardAbilitiesComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardAbilitiesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', {
      abilities: ['test a 1', 'test a 2'],
    });
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print abilities', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(2);
  });
});
