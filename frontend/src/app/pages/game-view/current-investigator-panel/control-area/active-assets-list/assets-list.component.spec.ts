import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AssetsListComponent } from 'pages/game-view/current-investigator-panel/control-area/active-assets-list/assets-list.component';
import {
  cardA,
  cardA3,
} from '../../../../../shared/domain/test/entities/test-cards';
import { getTranslocoModule } from '../../../../../shared/domain/test/transloco.testing';

describe('ActiveAssetsListComponent', () => {
  let component: AssetsListComponent;
  let fixture: ComponentFixture<AssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [AssetsListComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsListComponent);
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
