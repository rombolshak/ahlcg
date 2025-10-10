import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardA3 } from 'shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../shared/domain/test/transloco.testing';
import { PassiveAssetsListComponent } from './passive-assets-list.component';

describe('PassiveAssetsListComponent', () => {
  let component: PassiveAssetsListComponent;
  let fixture: ComponentFixture<PassiveAssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassiveAssetsListComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(PassiveAssetsListComponent);
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
