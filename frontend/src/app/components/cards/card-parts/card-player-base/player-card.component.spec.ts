import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCardComponent } from './player-card.component';
import { cardA, displayOption } from 'models/test/test-cards';

describe('CardPlayerBaseComponent', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
