import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSubtitleComponent } from './card-subtitle.component';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../../domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('CardSubtitleComponent', () => {
  let component: CardSubtitleComponent;
  let fixture: ComponentFixture<CardSubtitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [CardSubtitleComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardSubtitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
