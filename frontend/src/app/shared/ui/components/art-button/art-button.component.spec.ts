import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { ArtButtonComponent } from './art-button.component';

describe('ArtButtonComponent', () => {
  let component: ArtButtonComponent;
  let fixture: ComponentFixture<ArtButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [ArtButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
