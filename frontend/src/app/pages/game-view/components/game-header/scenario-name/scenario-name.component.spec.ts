import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioNameComponent } from './scenario-name.component';

describe('ScenarioNameComponent', () => {
  let component: ScenarioNameComponent;
  let fixture: ComponentFixture<ScenarioNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioNameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioNameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
