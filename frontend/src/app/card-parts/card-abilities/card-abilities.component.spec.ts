import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardAbilitiesComponent } from './card-abilities.component';

describe('CardAbilityComponent', () => {
  let component: CardAbilitiesComponent;
  let fixture: ComponentFixture<CardAbilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardAbilitiesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CardAbilitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
