import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '../../../../../domain/test/transloco.testing';
import { CardTitleComponent } from './card-title.component';

describe('CardTitleComponent', () => {
  let component: CardTitleComponent;
  let fixture: ComponentFixture<CardTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardTitleComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', { title: 'Test title' });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print title', () => {
    expect(fixture.debugElement.queryAll(By.css('div')).length).toEqual(1);
    expect(
      fixture.debugElement.query(By.css('div')).nativeElement.innerText,
    ).toContain('Test title');
  });
});
