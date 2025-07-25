import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFlavorComponent } from './card-flavor.component';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { getTranslocoModule } from '../../../../../domain/test/transloco.testing';

describe('CardFlavorComponent', () => {
  let component: CardFlavorComponent;
  let fixture: ComponentFixture<CardFlavorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardFlavorComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardFlavorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', { flavor: 'Test flavor' });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print flavor', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(1);
    expect(
      fixture.debugElement.query(By.css('p')).nativeElement.innerText,
    ).toContain('Test flavor');
  });
});
