import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardA3, cardA4 } from '@domain/testing/entities/test-cards';
import { AssetsListComponent } from '@pages/game-view/current-investigator-panel/control-area/active-assets-list/assets-list.component';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';

describe('ActiveAssetsListComponent', () => {
  let component: AssetsListComponent;
  let fixture: ComponentFixture<AssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
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
    expect(fixture.debugElement.queryAll(By.css('ah-controlled-asset')).length).toBe(3);
  });
});
