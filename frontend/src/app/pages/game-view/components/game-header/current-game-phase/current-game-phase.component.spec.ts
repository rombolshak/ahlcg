import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentGamePhaseComponent } from './current-game-phase.component';

describe('CurrentGamePhaseComponent', () => {
  let component: CurrentGamePhaseComponent;
  let fixture: ComponentFixture<CurrentGamePhaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentGamePhaseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrentGamePhaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
