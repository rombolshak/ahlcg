import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { TitleComponent } from './title.component';

describe('TitleComponent', () => {
  let component: TitleComponent;
  let fixture: ComponentFixture<TitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TitleComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(TitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
