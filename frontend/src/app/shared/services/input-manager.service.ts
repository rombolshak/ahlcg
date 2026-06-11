import { DOCUMENT, inject, Injectable } from '@angular/core';

type GeneralAction = 'confirm' | 'cancel';
type Navigation = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight';
type Debug = 'toggleDebugPanel' | 'resetState' | 'applyPatch';
export type InputCommand = GeneralAction | Navigation | Debug;

export type InputHandler = () => void;
export type InputLayer = Partial<Record<InputCommand, InputHandler>>;

@Injectable({
  providedIn: 'root',
})
export class InputManagerService {
  private readonly layers: InputLayer[] = [];
  private readonly globalLayer: InputLayer = {};

  constructor() {
    inject<Document>(DOCUMENT).addEventListener('keydown', this.onKeyDown);
  }

  public pushLayer(layer: InputLayer): void {
    this.layers.push(layer);
  }

  public popLayer(): void {
    this.layers.pop();
  }

  public registerGlobal(command: InputCommand, handler: InputHandler): void {
    this.globalLayer[command] = handler;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const command = eventToCommand(event);
    if (!command) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const handlers = this.layers.at(-1);
    const handler = handlers?.[command];
    if (handler) {
      handler();
    }
  };
}

export function eventToCommand(event: KeyboardEvent): InputCommand | undefined {
  switch (event.code) {
    case 'ArrowUp':
    case 'W':
      return 'moveUp';

    case 'ArrowDown':
    case 'S':
      return 'moveDown';

    case 'ArrowLeft':
    case 'A':
      return 'moveLeft';

    case 'ArrowRight':
    case 'D':
      return 'moveRight';

    case 'Enter':
    case 'Space':
      return 'confirm';

    case 'Esc':
      return 'cancel';
  }

  return undefined;
}
