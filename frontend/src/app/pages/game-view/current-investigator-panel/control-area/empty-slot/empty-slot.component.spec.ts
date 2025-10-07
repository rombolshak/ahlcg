import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptySlotComponent } from './empty-slot.component';

describe('EmptySlotComponent', () => {
  let component: EmptySlotComponent;
  let fixture: ComponentFixture<EmptySlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptySlotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmptySlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
