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
    <p class="text-white text-3xl absolute top-2.5 left-7">1</p>
    <p class="text-center w-full absolute top-3">
        Исследовательские заметки
    </p>
    <p class="absolute text-[11px] font-bold uppercase top-[3.75rem] left-5">Актив</p>
    <div class="absolute top-20">
      <img src="/assets/images/AHLCG-SkillBox-K.png" class="relative">
      <img src="/assets/images/AHLCG-SkillIcon-I.png" class="absolute top-2 left-3">
    </div>

    <div class="absolute top-80 w-full text-xs px-4">
      <p class="text-center text-xs italic font-bold"><span>Вещь. </span><span>Книга. </span><span>Наука. </span></p>
      <p class="mb-1">После того как свойство карты игрока поместило в вашу локацию хотя бы 1 вашу улику: Положите на эту карту столько же ресурсов как подтверждения.</p>
      <p>: Пройдите проверку  (0). За каждую единицу, на которую превысили сложность, можете потратить 1 подтверждение, чтобы найти 1 улику в вашей локации.</p>
    </div>
    <img src="/assets/images/AHLCG-Slot-1 Hand.png" class="absolute bottom-4 right-3" />
  `,
  styles: `:host { @apply block relative; width: 375px; height: 525px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {

}
