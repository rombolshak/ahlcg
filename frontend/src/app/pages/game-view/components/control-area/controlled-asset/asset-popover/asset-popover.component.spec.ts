import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetPopoverComponent } from './asset-popover.component';
import { cardA } from 'shared/domain/test/test-cards';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('AssetPopoverComponent', () => {
  let component: AssetPopoverComponent;
  let fixture: ComponentFixture<AssetPopoverComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [AssetPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetPopoverComponent);
    fixture.componentRef.setInput('asset', cardA);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
