import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetDetailIconComponent } from './asset-detail-icon.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('AssetDetailIconComponent', () => {
  let component: AssetDetailIconComponent;
  let fixture: ComponentFixture<AssetDetailIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [AssetDetailIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetDetailIconComponent);
    fixture.componentRef.setInput('detail', 'test-detail');
    fixture.componentRef.setInput('image', 'test-image');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display image', () => {
    expect(
      (
        fixture.debugElement.query(By.css('img'))
          .nativeElement as HTMLImageElement
      ).src,
    ).toEqual('test-image');
  });

  it('should display detail text', () => {
    expect(
      (
        fixture.debugElement.query(By.css('span'))
          .nativeElement as HTMLSpanElement
      ).textContent,
    ).toContain('test-detail');
  });

  it('should not display detail text', async () => {
    fixture.componentRef.setInput('withoutText', true);
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('span')).length).toBe(0);
  });
});
