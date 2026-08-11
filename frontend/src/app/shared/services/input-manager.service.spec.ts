import { TestBed } from '@angular/core/testing';

import { InputManagerService } from 'shared/services/input-manager.service';

describe('InputManagerService', () => {
  let service: InputManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should ignore keys typed into a text input except Escape and Enter', () => {
    const calls: string[] = [];
    service.registerGlobal({
      confirm: () => {
        calls.push('confirm');
      },
      cancel: () => {
        calls.push('cancel');
      },
      moveLeft: () => {
        calls.push('moveLeft');
      },
    });

    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Tab', bubbles: true }));

    expect(calls).toEqual([]);

    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', bubbles: true }));

    expect(calls).toEqual(['cancel', 'confirm']);

    document.body.removeChild(input);
  });
});
