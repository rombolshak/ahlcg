import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogComponent } from './dialog.component';
import { DialogService } from './dialog.service';
import { provideZonelessChangeDetection } from '@angular/core';
import createSpyObj = jasmine.createSpyObj;

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  const service = createSpyObj<DialogService>(['register', 'unregister']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent],
      providers: [
        { provide: DialogService, useValue: service },
        provideZonelessChangeDetection(),
      ],
    }).compileComponents();

    service.register.calls.reset();
    fixture = TestBed.createComponent(DialogComponent);
    fixture.componentRef.setInput('id', 'test');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should register in service', () => {
    expect(service.register.calls.count()).toBe(1);
    expect(service.register.calls.first().args[0]).toEqual('test');
  });
});
