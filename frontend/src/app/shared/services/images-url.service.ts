import { Injectable } from '@angular/core';
import {
  AssetSlot,
  Faction,
  PlayerCardType,
  SkillType,
} from '../domain/entities/player-card.model';

type CardTemplateType = PlayerCardType | 'investigator-details';
type SetName = string;
type SetIndex = string;
type SimpleOverlayType = 'clue' | 'resource' | 'doom' | 'health' | 'sanity';

type ImageDescriptor =
  | ['card-template', CardTemplateType, Faction]
  | ['illustration' | 'mini-illustration' | 'investigator', SetName, SetIndex]
  | ['set-icon', SetName]
  | ['card-overlay', SimpleOverlayType]
  | ['card-overlay', 'skill', 'icon', SkillType]
  | ['card-overlay', 'skill', 'box', Faction]
  | ['card-overlay', 'slot', AssetSlot]
  | ['card-overlay', 'title' | 'subtitle', Faction];

@Injectable({
  providedIn: 'root',
})
export class ImagesUrlService {
  getUrl(desc: ImageDescriptor | string): string {
    if (Array.isArray(desc)) return `/assets/images/${desc.join('/')}.webp`;
    return `/assets/images/${desc}.webp`;
  }
}
