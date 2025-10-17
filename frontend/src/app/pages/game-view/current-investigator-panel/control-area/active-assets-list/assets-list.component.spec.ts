import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardA3, cardA4 } from '@domain/test/entities/test-cards';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { AssetsListComponent } from 'pages/game-view/current-investigator-panel/control-area/active-assets-list/assets-list.component';

describe('ActiveAssetsListComponent', () => {
  let component: AssetsListComponent;
  let fixture: ComponentFixture<AssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [AssetsListComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetsListComponent);
    fixture.componentRef.setInput('activeAssets', [cardA, cardA3]);
    fixture.componentRef.setInput('passiveAssets', [cardA4]);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all assets', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-controlled-asset')).length,
    ).toBe(3);
  });
});
