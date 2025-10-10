import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  cardA,
  cardA3,
} from '../../../../../shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../shared/domain/test/transloco.testing';
import { ActiveAssetsListComponent } from './active-assets-list.component';

describe('ActiveAssetsListComponent', () => {
  let component: ActiveAssetsListComponent;
  let fixture: ComponentFixture<ActiveAssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [ActiveAssetsListComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveAssetsListComponent);
    fixture.componentRef.setInput('assets', [cardA, cardA3]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all assets', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-controlled-asset')).length,
    ).toBe(2);
  });
});
