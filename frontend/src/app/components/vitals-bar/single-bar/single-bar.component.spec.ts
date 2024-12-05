import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleBarComponent } from './single-bar.component';

describe('SingleBarComponent', () => {
  let component: SingleBarComponent;
  let fixture: ComponentFixture<SingleBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SingleBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SingleBarComponent);
    fixture.componentRef.setInput('max', 5);
    fixture.componentRef.setInput('current', 2);
    fixture.componentRef.setInput('goodColor', '');
    fixture.componentRef.setInput('badColor', '');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
