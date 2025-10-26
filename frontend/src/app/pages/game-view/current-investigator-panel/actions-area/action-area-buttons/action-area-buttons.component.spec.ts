import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionAreaButtonsComponent } from './action-area-buttons.component';

describe('ActionAreaButtonsComponent', () => {
  let component: ActionAreaButtonsComponent;
  let fixture: ComponentFixture<ActionAreaButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionAreaButtonsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionAreaButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
