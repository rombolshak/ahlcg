import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardCopyrightComponent } from './card-copyright.component';

describe('CardCopyrightComponent', () => {
  let component: CardCopyrightComponent;
  let fixture: ComponentFixture<CardCopyrightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardCopyrightComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardCopyrightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
