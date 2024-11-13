import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsHandComponent } from './cards-hand.component';

describe('CardsHandComponent', () => {
  let component: CardsHandComponent;
  let fixture: ComponentFixture<CardsHandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardsHandComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardsHandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
