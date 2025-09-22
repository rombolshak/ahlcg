import { Injectable } from '@angular/core';
import {
  AssetSlot,
  PlayerCardClassType,
  SkillType,
} from '../domain/entities/player-card.model';

type CardTemplateType = 'asset' | 'event' | 'skill' | 'investigator';
type SetName = string;
type SetIndex = string;
type SimpleOverlayType = 'clue' | 'resource' | 'doom' | 'health' | 'sanity';

type ImageDescriptor =
  | ['card-template', CardTemplateType, PlayerCardClassType]
  | ['illustration' | 'investigator', SetName, SetIndex]
  | ['set-icon', SetName]
  | ['card-overlay', SimpleOverlayType]
  | ['card-overlay', 'skill', 'box', PlayerCardClassType]
  | ['card-overlay', 'skill', 'icon', SkillType]
  | ['card-overlay', 'slot', AssetSlot]
  | ['card-overlay', 'title' | 'subtitle', PlayerCardClassType];

@Injectable({
  providedIn: 'root',
})
export class ImagesUrlService {
  getUrl(desc: ImageDescriptor): string {
    return `/assets/images/${desc.join('/')}.webp`;
  }
}
