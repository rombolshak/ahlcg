import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityAvatarComponent } from './entity-avatar.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { InvestigatorS } from 'shared/domain/test/test-investigators';

describe('EntityAvatarComponent', () => {
  let component: EntityAvatarComponent;
  let fixture: ComponentFixture<EntityAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [EntityAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAvatarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', InvestigatorS);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
