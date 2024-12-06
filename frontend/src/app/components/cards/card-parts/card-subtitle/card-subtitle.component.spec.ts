import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSubtitleComponent } from './card-subtitle.component';
import { cardA } from 'models/test/test-cards';

describe('CardSubtitleComponent', () => {
  let component: CardSubtitleComponent;
  let fixture: ComponentFixture<CardSubtitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardSubtitleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardSubtitleComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
