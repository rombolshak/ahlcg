import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtPanelComponent } from './art-panel.component';

describe('ArtPanelComponent', () => {
  let component: ArtPanelComponent;
  let fixture: ComponentFixture<ArtPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
