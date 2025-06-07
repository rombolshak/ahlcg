import { inject, Injectable, Injector, Signal } from '@angular/core';
import { Translation, TranslocoService } from '@jsverse/transloco';
import {
  cardInfo,
  CardInfo,
  SetInfo,
} from '../domain/entities/details/card-info.model';
import { HttpClient } from '@angular/common/http';
import { ArkErrors, type } from 'arktype';
import { combineLatest, map, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

const cardDescription = type({
  fields: cardInfo.keyof().array(),
  traits: 'string[]',
  abilities: 'number >= 0',
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
  private readonly injector = inject(Injector);

  public getCardInfo(setInfo: SetInfo): Signal<CardInfo | undefined> {
    const desc$ = this.getCardDescription(setInfo);
    const strings$ = this.getCardStrings(setInfo);
    const traits$ = this.getTraits();

    return toSignal(
      combineLatest([desc$, strings$, traits$]).pipe(
        map((data) => {
          const [desc, strings, traits] = data;
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
          desc.traits.forEach((trait) => {
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
            console.error(info);
            return info.throw();
          }

          return info;
        }),
      ),
      { injector: this.injector },
    );
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
            console.error(model);
            return model.throw();
          }

          return model;
        }),
      );
  }
}
