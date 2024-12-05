import { Injectable } from '@angular/core';
import {
  PlayerCardClass,
  AssetSlot,
  PlayerCardType,
  SkillType,
} from '../models/player-card.model';
import { SetInfo } from '../models/card-info.model';

@Injectable({
  providedIn: 'root',
})
export class ImagesUrlService {
  getTemplate(type: string, cardClass: string): string {
    return `/assets/images/card-templates/${type}-${cardClass}.webp`;
  }

  getOverlay(info: Overlay): string {
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
    cardClass: PlayerCardClass | AssetSlot | SkillType,
  ): string {
    return `/assets/images/card-overlays/${OverlayType[type]}-${cardClass}.png`;
  }
}

enum OverlayType {
  SkillBox,
  SkillIcon,
  Slot,
}

type Overlay =
  | {
      type: OverlayType.SkillBox;
      value: PlayerCardClass;
    }
  | {
      type: OverlayType.SkillIcon;
      value: SkillType;
    }
  | {
      type: OverlayType.Slot;
      value: AssetSlot;
    };

export class CreateOverlay {
  static skillBox(value: PlayerCardClass): Overlay {
    return { type: OverlayType.SkillBox, value: value };
  }

  static skillIcon(value: SkillType): Overlay {
    return { type: OverlayType.SkillIcon, value: value };
  }

  static cardSlot(value: AssetSlot): Overlay {
    return { type: OverlayType.Slot, value: value };
  }
}
