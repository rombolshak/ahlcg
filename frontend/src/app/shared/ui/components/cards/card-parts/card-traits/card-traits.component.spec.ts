import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { displayOption } from 'shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../domain/test/transloco.testing';
import { CardTraitsComponent } from './card-traits.component';

describe('CardTraitsComponent', () => {
  let component: CardTraitsComponent;
  let fixture: ComponentFixture<CardTraitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardTraitsComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTraitsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', { traits: ['TraitA', 'TraitB'] });
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print traits', () => {
    expect(fixture.debugElement.queryAll(By.css('span')).length).toEqual(2);

    expect(
      fixture.debugElement.query(By.css('span')).nativeElement.innerText,
    ).toContain('TraitA');
  });
});
