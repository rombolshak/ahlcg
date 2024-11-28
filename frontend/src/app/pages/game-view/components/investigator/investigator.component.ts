import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ImagesUrlService } from '../../../../services/images-url.service';
import { CardInfo, CardType } from '../../../../models/card-info.model';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ah-investigator',
  imports: [NgOptimizedImage],
  template: `
    <div
      class="flex p-1 rounded-lg outline outline-2 outline-orange-300 relative"
    >
      <img
        ngSrc="/assets/images/card-templates/Investigator-Seeker.webp"
        fill
        class="-z-30"
      />
      <img
        width="100"
        height="153"
        [ngSrc]="imagesService.getInvestigator(card.setInfo)"
        class="rounded-lg "
      />
      <div class="flex flex-col justify-center items-center text-center">
        <div
          class="relative flex w-16 h-10 justify-between items-center pl-2 pr-4"
        >
          <img
            ngSrc="/assets/images/card-overlays/SkillBox-Seeker.png"
            class="-z-20 absolute left-0 h-10"
            width="73"
            height="46"
          />

          <span class="text-slate-700 font-teutonic text-2xl">2</span>
          <img
            class="max-w-none h-6"
            ngSrc="assets/images/card-overlays/SkillIcon-Willpower.png"
            width="24"
            height="25"
          />
        </div>

        <div
          class="relative flex w-16 h-10 justify-between items-center pl-2 pr-4"
        >
          <img
            ngSrc="/assets/images/card-overlays/SkillBox-Seeker.png"
            class="-z-20 absolute left-0 h-10"
            width="73"
            height="46"
          />

          <span class="text-slate-700 font-teutonic text-2xl">3</span>
          <img
            class="max-w-none h-6"
            ngSrc="assets/images/card-overlays/SkillIcon-Intellect.png"
            width="24"
            height="25"
          />
        </div>
        <div
          class="relative flex w-16 h-10 justify-between items-center pl-2 pr-4"
        >
          <img
            ngSrc="/assets/images/card-overlays/SkillBox-Seeker.png"
            class="-z-20 absolute left-0 h-10"
            width="73"
            height="46"
          />

          <span class="text-slate-700 font-teutonic text-2xl">1</span>
          <img
            class="max-w-none h-6"
            ngSrc="assets/images/card-overlays/SkillIcon-Combat.png"
            width="24"
            height="25"
          />
        </div>
        <div
          class="relative flex w-16 h-10 justify-between items-center pl-2 pr-4"
        >
          <img
            ngSrc="/assets/images/card-overlays/SkillBox-Seeker.png"
            class="-z-20 absolute left-0 h-10"
            width="73"
            height="46"
          />

          <span class="text-slate-700 font-teutonic text-2xl">4</span>
          <img
            class="max-w-none h-6"
            ngSrc="assets/images/card-overlays/SkillIcon-Agility.png"
            width="24"
            height="25"
          />
        </div>
        <!--
                <img
                  src="assets/images/card-overlays/SkillIcon-Intellect.png"
                  width="24"
                />

                <img
                  src="assets/images/card-overlays/SkillIcon-Combat.png"
                  width="24"
                />

                <img
                  src="assets/images/card-overlays/SkillIcon-Agility.png"
                  width="24"
                />
                <span class="text-white font-teutonic text-2xl">1</span>
                <span class="text-white font-teutonic text-2xl">0</span>
                <span class="text-white font-teutonic text-2xl">3</span>

                <img
                  src="assets/images/card-overlays/resource.png"
                  class="col-start-3 col-end-5 row-start-1 row-end-3 filter brightness-75 ml-2"
                />
                <img
                  src="assets/images/card-overlays/clue.png"
                  class=" col-start-3 col-end-5 row-start-3 row-end-5 filter brightness-75 ml-2"
                />
                <span
                  class="z-10 text-white font-teutonic text-4xl col-start-3 col-end-5 row-start-1 row-end-3 ml-2"
                  >4</span
                >
                <span
                  class="z-10 text-white font-teutonic text-4xl col-start-3 col-end-5 row-start-3 row-end-5 ml-2"
                  >1</span
                >
                -->
      </div>
    </div>
  `,
  styles: `
    :host {
      .noise:before {
        content: '';
        background-color: transparent;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E");
        background-repeat: repeat;
        background-size: 182px;
        opacity: 0.12;
        top: 0;
        left: 0;
        position: absolute;
        width: 100%;
        height: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  protected readonly card: CardInfo = {
    setInfo: {
      set: '01',
      index: '002',
    },
    id: '01002',
    title: 'Daisy Walker',
    cardType: CardType.Investigator,
    copyright: {
      ffg: '2016',
      illustrator: 'Magali Villeneuve',
    },
  };
}
