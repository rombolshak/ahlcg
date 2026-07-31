import { DOCUMENT, inject, Injectable } from '@angular/core';

type GeneralAction = 'confirm' | 'cancel' | 'none';
type Navigation = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight';
type Debug = 'toggleDebugPanel' | 'resetState' | 'applyPatch';
export type InputCommand = GeneralAction | Navigation | Debug;

export type InputHandler = () => void | Promise<void>;
export type InputLayer = Partial<Record<InputCommand, InputHandler>>;
export interface LayerRef {
  layer: InputLayer;
  destroy: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class InputManagerService {
  private readonly layers: InputLayer[] = [];
  private globalLayer: InputLayer = {};
  private readonly keyToCommand = new Map<string, InputCommand>([
    ['Enter', 'confirm'],
    ['Space', 'confirm'],
    ['Escape', 'cancel'],

    ['ArrowUp', 'moveUp'],
    ['KeyW', 'moveUp'],
    ['ArrowDown', 'moveDown'],
    ['KeyS', 'moveDown'],
    ['ArrowLeft', 'moveLeft'],
    ['KeyA', 'moveLeft'],
    ['ArrowRight', 'moveRight'],
    ['KeyD', 'moveRight'],

    ['Backquote', 'toggleDebugPanel'],
    ['F8', 'resetState'],
    ['F9', 'applyPatch'],
    ['Tab', 'none'], // disable tab navigation
  ]);

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    inject<Document>(DOCUMENT).addEventListener('keydown', async $event => {
      await this.onKeyDown($event);
    });
  }

  public pushLayer(layer: InputLayer): LayerRef {
    this.layers.push(layer);
    return {
      layer,
      destroy: () => {
        const index = this.layers.indexOf(layer);
        if (index !== -1) {
          this.layers.splice(index, 1);
        }
      },
    };
  }

  public registerGlobal(layer: InputLayer): void {
    this.globalLayer = {
      ...this.globalLayer,
      ...layer,
    };
  }

  private onKeyDown = async (event: KeyboardEvent): Promise<void> => {
    const command = this.keyToCommand.get(event.code);
    if (!command) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const handlers = this.layers.at(-1);
    const handler = handlers?.[command] ?? this.globalLayer[command];
    if (handler) {
      await handler();
    }
  };
}
