import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardPlayerBaseComponent } from './card-player-base.component';

describe('CardPlayerBaseComponent', () => {
  let component: CardPlayerBaseComponent;
  let fixture: ComponentFixture<CardPlayerBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardPlayerBaseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardPlayerBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
