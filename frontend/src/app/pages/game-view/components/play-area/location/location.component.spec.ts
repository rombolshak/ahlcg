import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationComponent } from './location.component';
import { testLocation } from 'shared/domain/test/test-locations';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('location', testLocation);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
