import { ChangeDetectionStrategy, Component } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'ah-player-card',
  standalone: true,
  imports: [
    NgOptimizedImage
  ],
  template: `
    <img ngSrc="/assets/images/AHLCG-Asset-K.png" fill class="-z-10" />
    <img src="/assets/images/09045.jpg" class="-z-20 absolute top-7"  />
    <div class="text-white w-6 text-center text-3xl absolute top-2.5 left-6 font-teutonic drop-shadow-[2px_2px_2px_rgba(0,0,0,1)]">1</div>
    <p class="text-center w-full absolute top-3 font-conkordia text-2xl">
        Исследовательские заметки
    </p>
    <p class="absolute text-[11px] bold uppercase top-[3.85rem] left-5 font-arno">Актив</p>
    <div class="absolute top-20">
      <img src="/assets/images/AHLCG-SkillBox-K.png" class="relative">
      <img src="/assets/images/AHLCG-SkillIcon-I.png" class="absolute top-2 left-3">
    </div>

    <div class="absolute top-80 w-full leading-4 px-4 font-arno text-[15px]">
      <p class="text-center mb-1 italic font-arno-bold"><span>Вещь. </span><span>Книга. </span><span>Наука. </span></p>
      <p class="mb-1"><span class="font-ah-symbol">r </span>После того как свойство карты игрока поместило в вашу локацию хотя бы 1 вашу улику: Положите на эту карту столько же ресурсов как подтверждения.</p>
      <p><span class="font-ah-symbol">n</span>: Пройдите проверку <span class="font-ah-symbol">i</span>(0). За каждую единицу, на которую превысили сложность, можете потратить 1 подтверждение, чтобы найти 1 улику в вашей локации.</p>
    </div>
    <img src="/assets/images/AHLCG-Slot-1 Hand.png" class="absolute bottom-3 right-3" />
  `,
  styles: `:host { @apply block relative; width: 375px; height: 525px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {

}
