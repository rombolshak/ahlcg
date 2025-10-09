import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassiveAssetsListComponent } from './passive-assets-list.component';

describe('PassiveAssetsListComponent', () => {
  let component: PassiveAssetsListComponent;
  let fixture: ComponentFixture<PassiveAssetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassiveAssetsListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PassiveAssetsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
