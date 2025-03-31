import { Injectable } from '@angular/core';
import {
  PlayerCardClassType,
  AssetSlot,
  SkillType,
} from 'shared/domain/player-card.model';
import { SetInfo } from 'shared/domain/card-info.model';

@Injectable({
  providedIn: 'root',
})
export class ImagesUrlService {
  getTemplate(type: string, cardClass: string): string {
    return `/assets/images/card-templates/${type}-${cardClass}.webp`;
  }

  getOverlay(info: Overlay | null): string {
    if (!info) return '';
    return this.getOverlayInternal(info.type, info.value);
  }

  getSimpleOverlay(type: string) {
    return `/assets/images/card-overlays/${type}.png`;
  }

  getSetIcon(setId: string): string {
    return `/assets/images/set-icons/${setId}.png`;
  }

  getIllustration(info: SetInfo): string {
    return `/assets/images/illustrations/${info.set}/${info.index}.webp`;
  }

  getMiniIllustration(info: SetInfo): string {
    return `/assets/images/illustrations/${info.set}/${info.index}-m.webp`;
  }

  getInvestigator(info: SetInfo): string {
    return `/assets/images/investigators/${info.set}/${info.index}.webp`;
  }

  private getOverlayInternal(
    type: OverlayType,
    cardClass: PlayerCardClassType | AssetSlot | SkillType,
  ): string {
    return `/assets/images/card-overlays/${type}-${cardClass}.png`;
  }
}

type OverlayType = 'skill-box' | 'skill-icon' | 'slot';

type Overlay =
  | {
      type: 'skill-box';
      value: PlayerCardClassType;
    }
  | {
      type: 'skill-icon';
      value: SkillType;
    }
  | {
      type: 'slot';
      value: AssetSlot;
    };

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CreateOverlay {
  static skillBox(value: PlayerCardClassType): Overlay {
    return { type: 'skill-box', value: value };
  }

  static skillIcon(value: SkillType): Overlay {
    return { type: 'skill-icon', value: value };
  }

  static cardSlot(value?: AssetSlot): Overlay | null {
    if (!value) return null;
    return { type: 'slot', value: value };
  }
}
