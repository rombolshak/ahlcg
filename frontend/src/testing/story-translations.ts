import { Translation } from '@jsverse/transloco';
import { fixtureTranslations, translocoTestingModule } from './transloco-fixtures';

const storyTranslations: Record<string, Translation> = { ...fixtureTranslations };

export function registerStoryTranslation(path: string, translation: Translation): void {
  storyTranslations[path] = translation;
}

export function getStoryTranslocoModule() {
  return translocoTestingModule(storyTranslations);
}
