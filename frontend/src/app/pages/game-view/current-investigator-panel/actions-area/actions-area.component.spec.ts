import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { testActions } from '@domain/test/test-actions';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { ActionsAreaComponent } from './actions-area.component';

describe('ActionsAreaComponent', () => {
  let component: ActionsAreaComponent;
  let fixture: ComponentFixture<ActionsAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionsAreaComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionsAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actions', testActions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
