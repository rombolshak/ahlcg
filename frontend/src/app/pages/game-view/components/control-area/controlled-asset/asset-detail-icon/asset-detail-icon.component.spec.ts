import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetDetailIconComponent } from './asset-detail-icon.component';

describe('AssetDetailIconComponent', () => {
  let component: AssetDetailIconComponent;
  let fixture: ComponentFixture<AssetDetailIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetDetailIconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetDetailIconComponent);
    fixture.componentRef.setInput('detail', undefined);
    fixture.componentRef.setInput('image', '');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
