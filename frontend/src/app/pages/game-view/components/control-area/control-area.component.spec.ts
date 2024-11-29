import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlAreaComponent } from './control-area.component';

describe('ControlAreaComponent', () => {
  let component: ControlAreaComponent;
  let fixture: ComponentFixture<ControlAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('assets', []);
    fixture.componentRef.setInput('states', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
