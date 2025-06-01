import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSubtitleComponent } from './card-subtitle.component';
import { cardA } from 'shared/domain/test/entities/test-cards';
import { provideZonelessChangeDetection } from '@angular/core';

describe('CardSubtitleComponent', () => {
  let component: CardSubtitleComponent;
  let fixture: ComponentFixture<CardSubtitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CardSubtitleComponent],
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
