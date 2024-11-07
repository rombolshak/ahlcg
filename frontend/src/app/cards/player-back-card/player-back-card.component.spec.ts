import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerBackCardComponent } from './player-back-card.component';

describe('PlayerBackCardComponent', () => {
  let component: PlayerBackCardComponent;
  let fixture: ComponentFixture<PlayerBackCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerBackCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerBackCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
