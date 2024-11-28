import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameViewComponent } from './game-view.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('GameViewComponent', () => {
  let component: GameViewComponent;
  let fixture: ComponentFixture<GameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameViewComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GameViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
