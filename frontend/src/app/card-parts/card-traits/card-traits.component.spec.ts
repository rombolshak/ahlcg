import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardTraitsComponent } from './card-traits.component';

describe('CardTraitsComponent', () => {
  let component: CardTraitsComponent;
  let fixture: ComponentFixture<CardTraitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardTraitsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardTraitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
