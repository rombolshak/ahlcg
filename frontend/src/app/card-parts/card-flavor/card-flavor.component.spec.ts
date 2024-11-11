import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFlavorComponent } from './card-flavor.component';

describe('CardFlavorComponent', () => {
  let component: CardFlavorComponent;
  let fixture: ComponentFixture<CardFlavorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardFlavorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardFlavorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
