import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionsAreaComponent } from './actions-area.component';

describe('ActionsAreaComponent', () => {
  let component: ActionsAreaComponent;
  let fixture: ComponentFixture<ActionsAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionsAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionsAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
