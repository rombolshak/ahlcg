import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { DialogComponent } from './dialog.component';
import { DialogService } from './dialog.service';
import createSpyObj = jasmine.createSpyObj;

describe('DialogComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;
  const service = createSpyObj<DialogService>([
    'register',
    'unregister',
    'open',
    'close',
  ]);

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

  it('should be opened by input', () => {
    fixture.componentRef.setInput('open', true);
    TestBed.tick();

    expect(service.open.calls.count()).toBe(1);
  });
});
