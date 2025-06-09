import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetCardComponent } from './asset-card.component';
import { cardA, displayOption } from 'shared/domain/test/entities/test-cards';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('AssetCardComponent', () => {
  let component: AssetCardComponent;
  let fixture: ComponentFixture<AssetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [AssetCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
