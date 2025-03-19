import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationsConnectionComponent } from './locations-connection.component';

describe('LocationsConnectionComponent', () => {
  let component: LocationsConnectionComponent;
  let fixture: ComponentFixture<LocationsConnectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationsConnectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationsConnectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
