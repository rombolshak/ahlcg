import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  Signal,
} from '@angular/core';
import { Translation, TranslocoService } from '@jsverse/transloco';
import {
  cardInfo,
  CardInfo,
  SetInfo,
} from '../domain/entities/details/card-info.model';
import { HttpClient } from '@angular/common/http';
import { ArkErrors, type } from 'arktype';
import { combineLatest, map, switchMap } from 'rxjs';
import { GameCard } from '../domain/entities/card.model';

const cardDescription = type({
  fields: cardInfo.keyof().array(),
  'traits?': 'string[]',
  abilities: 'number >= 0 = 0',
  objectives: 'number >= 0 = 0',
  copyright: {
    illustrator: 'string',
    ffg: 'string',
  },
});

type CardDescription = typeof cardDescription.infer;

@Injectable({
  providedIn: 'root',
})
export class CardInfoService {
  private readonly transloco = inject(TranslocoService);
  private readonly http = inject(HttpClient);

  private readonly cache = signal<Readonly<Record<string, CardInfo>>>({});

  public getCardInfo(
    card: Signal<GameCard | undefined>,
  ): Signal<CardInfo | undefined> {
    effect(() => {
      this.loadInfo(card()?.setInfo);
    });

    return computed(() => {
      const id = card()?.setInfo;
      if (!id) return undefined;
      const cache = this.cache();
      const model = cache[this.setInfoToString(id)];
      return model;
    });
  }

  private loadInfo(setInfo: SetInfo | undefined): void {
    if (
      setInfo === undefined ||
      this.cache()[this.setInfoToString(setInfo)] !== undefined
    ) {
      return;
    }

    const desc$ = this.getCardDescription(setInfo);
    const strings$ = this.getCardStrings(setInfo);
    const traits$ = this.getTraits();

    combineLatest([desc$, strings$, traits$])
      .pipe(
        map((data) => {
          const [desc, strings, traits] = data;
          return this.createInfoModel(setInfo, desc, strings, traits);
        }),
      )
      .subscribe({
        next: (model) => {
          this.cache.update((value) => {
            return {
              ...value,
              [this.setInfoToString(setInfo)]: model,
            };
          });
        },
        error: (err) => {
          console.error(
            `Error on loading card ${this.setInfoToString(setInfo)}`,
            err,
          );
          throw err;
        },
      });
  }

  private createInfoModel(
    setInfo: SetInfo,
    desc: CardDescription,
    strings: Translation,
    traits: Translation,
  ) {
    const model = {};

    // @ts-expect-error construct object manually, then validate via arktype
    model.setInfo = setInfo;
    // @ts-expect-error construct object manually, then validate via arktype
    model.copyright = desc.copyright;
    desc.fields.forEach((field) => {
      // @ts-expect-error construct object manually, then validate via arktype
      model[field] = this.getString(strings, field, setInfo);
    });

    // @ts-expect-error construct object manually, then validate via arktype
    model.traits = [];
    desc.traits?.forEach((trait) => {
      // @ts-expect-error construct object manually, then validate via arktype
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      model.traits.push(this.getString(traits, trait, setInfo));
    });

    // @ts-expect-error construct object manually, then validate via arktype
    model.abilities = [];
    for (let i = 1; i <= desc.abilities; i++) {
      // @ts-expect-error construct object manually, then validate via arktype
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      model.abilities.push(
        this.getString(strings, `a${i.toString()}`, setInfo),
      );
    }

    const info = cardInfo(model);
    if (info instanceof ArkErrors) {
      console.error(
        `Error on model creation of card ${this.setInfoToString(setInfo)}`,
        info.summary,
      );
      return info.throw();
    }

    return info;
  }

  private getString(
    strings: Translation,
    field: string,
    setInfo: SetInfo,
  ): string {
    const value = strings[field] as string | undefined;
    if (!value) {
      throw new Error(
        `No value found for '${field}' of card ${setInfo.set}-${setInfo.index}`,
      );
    }
    return value;
  }

  private getCardStrings(setInfo: SetInfo) {
    return this.transloco.langChanges$.pipe(
      switchMap((lang) => {
        return this.http.get<Translation>(
          `/assets/i18n/generated/cards/${setInfo.set}/${setInfo.index}/${lang}.json`,
        );
      }),
    );
  }

  private getTraits() {
    return this.transloco.langChanges$.pipe(
      switchMap((lang) => {
        return this.http.get<Translation>(
          `/assets/i18n/generated/traits/${lang}.json`,
        );
      }),
    );
  }

  private getCardDescription(setInfo: SetInfo) {
    return this.http
      .get<CardDescription>(
        `/assets/cards/${setInfo.set}/${setInfo.index}.json`,
      )
      .pipe(
        map((desc: CardDescription) => {
          const model = cardDescription(desc);
          if (model instanceof ArkErrors) {
            console.error(
              `Error in description of card ${this.setInfoToString(setInfo)}`,
              model.summary,
            );
            return model.throw();
          }

          return model;
        }),
      );
  }

  private setInfoToString(setInfo: SetInfo) {
    return `${setInfo.set}-${setInfo.index}`;
  }
}
