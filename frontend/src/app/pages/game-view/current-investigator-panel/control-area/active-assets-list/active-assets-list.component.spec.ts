import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveAssetsListComponent } from './active-assets-list.component';

describe('ActiveAssetsListComponent', () => {
  let component: ActiveAssetsListComponent;
  let fixture: ComponentFixture<ActiveAssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveAssetsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveAssetsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
