import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptySlotsListComponent } from './empty-slots-list.component';

describe('EmptySlotsListComponent', () => {
  let component: EmptySlotsListComponent;
  let fixture: ComponentFixture<EmptySlotsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptySlotsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptySlotsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
