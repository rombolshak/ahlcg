import { Injectable } from '@angular/core';
import { CardClass, CardSlot, CollectionInfo, PlayerCardType, SkillType } from '../models/player-card.model';

@Injectable({
  providedIn: 'root'
})
export class ImagesUrlService {
  getTemplate(type: PlayerCardType, cardClass: CardClass): string {
    return `/assets/images/card-templates/${type}-${cardClass}.png`;
  }

  getOverlay(info: Overlay) {
    return this.getOverlayInternal(info.type, info.value);
  }

  getSetIcon(setId: string): string {
    return `/assets/images/set-icons/${setId}.png`;
  }

  getIllustration(info: CollectionInfo): string {
    return `/assets/images/illustrations/${info.set}/${info.index}.webp`;
  }

  private getOverlayInternal(type: OverlayType, cardClass: CardClass | CardSlot | SkillType): string {
    return `/assets/images/card-overlays/${OverlayType[type]}-${cardClass}.png`;
  }
}

enum OverlayType {
  SkillBox,
  SkillIcon,
  Slot
}

type Overlay = {
  type: OverlayType.SkillBox;
  value: CardClass;
} | {
  type: OverlayType.SkillIcon;
  value: SkillType
} | {
  type: OverlayType.Slot;
  value: CardSlot
}

export class CreateOverlay {
  static skillBox(value: CardClass): Overlay {
    return { type: OverlayType.SkillBox, value: value };
  }

  static skillIcon(value: SkillType): Overlay {
    return { type: OverlayType.SkillIcon, value: value };
  }

  static cardSlot(value: CardSlot): Overlay {
    return { type: OverlayType.Slot, value: value };
  }
}
