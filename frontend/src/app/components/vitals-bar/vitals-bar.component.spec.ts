import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalsBarComponent } from './vitals-bar.component';

describe('VitalsBarComponent', () => {
  let component: VitalsBarComponent;
  let fixture: ComponentFixture<VitalsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitalsBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VitalsBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
