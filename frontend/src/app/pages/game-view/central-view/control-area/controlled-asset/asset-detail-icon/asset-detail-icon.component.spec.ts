import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetDetailIconComponent } from './asset-detail-icon.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('AssetDetailIconComponent', () => {
  let component: AssetDetailIconComponent;
  let fixture: ComponentFixture<AssetDetailIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [AssetDetailIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetDetailIconComponent);
    fixture.componentRef.setInput('detail', undefined);
    fixture.componentRef.setInput('image', '');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
