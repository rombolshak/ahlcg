import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { EmptySlotsListComponent } from './empty-slots-list.component';

describe('EmptySlotsListComponent', () => {
  let component: EmptySlotsListComponent;
  let fixture: ComponentFixture<EmptySlotsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [EmptySlotsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptySlotsListComponent);
    fixture.componentRef.setInput('slots', ['hand', 'body', 'ally']);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all slots', () => {
    expect(fixture.debugElement.queryAll(By.css('ah-empty-slot')).length).toBe(
      3,
    );
  });
});
