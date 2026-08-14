import { DOCUMENT, inject, Service } from '@angular/core';

type GeneralAction = 'confirm' | 'cancel' | 'none';
type Navigation = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight';
type Debug = 'toggleDebugPanel' | 'resetState' | 'applyPatch';
export type InputCommand = GeneralAction | Navigation | Debug;

export type InputHandler = () => void | Promise<void>;
export type InputLayer = Partial<Record<InputCommand, InputHandler>>;

/**
 * A layer whose handlers depend on state that changes while it is pushed — a dialog whose content
 * swaps views, say. Resolved on every keystroke rather than at push time, so which commands the
 * layer handles *at all* stays current too, and with it the fall-through to the global layer.
 */
export type InputLayerProvider = () => InputLayer;

export interface LayerRef {
  layer: InputLayer | InputLayerProvider;
  destroy: () => void;
}

@Service()
export class InputManagerService {
  private readonly layers: InputLayerProvider[] = [];
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

  private readonly textEntryInputTypes = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number']);

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    inject<Document>(DOCUMENT).addEventListener('keydown', async event => {
      // A form field wants every key it can make sense of — letters, digits, Space, Tab between
      // fields — so only Escape/Enter are taken from it; everything else is a global shortcut.
      if (this.isTextEntryElement(event.target) && event.code !== 'Escape' && event.code !== 'Enter') {
        return;
      }

      const command = this.keyToCommand.get(event.code);
      if (!command) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const handlers = this.layers.at(-1)?.();
      const handler = handlers?.[command] ?? this.globalLayer[command];
      if (handler) {
        await handler();
      }
    });
  }

  private isTextEntryElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLTextAreaElement) return true;
    if (target.isContentEditable) return true;
    if (target instanceof HTMLInputElement) return this.textEntryInputTypes.has(target.type);
    return false;
  }

  /** Pass a provider when the layer's handlers change while it is pushed; a plain object never restated. */
  public pushLayer(layer: InputLayer | InputLayerProvider): LayerRef {
    const provider = typeof layer === 'function' ? layer : () => layer;
    this.layers.push(provider);
    return {
      layer,
      destroy: () => {
        const index = this.layers.indexOf(provider);
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
}
