import { signal } from '@angular/core';
import { GameConnectionService, MemberState, MemberStateEvent } from '@features/games/game-connection.service';
import { GamesService } from '@features/games/games.service';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER, Observable, of } from 'rxjs';
import { FixtureGameComponent } from './fixture-game.component';
import { FixtureView } from './fixture-view.model';

const view: FixtureView = {
  shared: 3,
  revealed: 4,
  ownSecret: 7,
  actingPlayers: [],
  others: { 'user-2': 'Positive', 'user-3': 'Negative' },
  journal: [
    { key: 'fixture.revealed', parameters: { value: 2 } },
    { key: 'fixture.revealed', parameters: { value: 4 } },
  ],
};

const withEvents = (events: Observable<MemberStateEvent>) =>
  moduleMetadata({
    providers: [
      {
        provide: GameConnectionService,
        useValue: {
          state: signal({ status: 'connected' }),
          connect: () => undefined,
          disconnect: () => undefined,
          execute: () => NEVER,
          memberStateEvents: events,
        },
      },
      {
        provide: GamesService,
        useValue: {
          members: () =>
            of([
              { userId: 'user-2', userName: 'Roland', isAnonymous: false, isOnline: true },
              { userId: 'user-3', userName: null, isAnonymous: true, isOnline: false },
            ]),
        },
      },
    ],
  });

const meta: Meta<FixtureGameComponent> = {
  component: FixtureGameComponent,
  args: { id: 'game-1' },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<FixtureGameComponent>;

const offeredActions: MemberState['actions'] = {
  'shared:dec': [{ op: 'replace', path: '/shared', value: 2 }],
  'shared:inc': [{ op: 'replace', path: '/shared', value: 4 }],
  'secret:dec': [{ op: 'replace', path: '/ownSecret', value: 6 }],
  'secret:inc': [{ op: 'replace', path: '/ownSecret', value: 8 }],
  reveal: [{ op: 'replace', path: '/revealed', value: 5 }],
};

export const Ready: Story = {
  decorators: [withEvents(of<MemberStateEvent>({ kind: 'reset', state: { version: 1, view, actions: {} } }))],
};

export const YourMove: Story = {
  decorators: [withEvents(of<MemberStateEvent>({ kind: 'reset', state: { version: 1, view, actions: offeredActions } }))],
};

export const Waiting: Story = {
  decorators: [withEvents(of<MemberStateEvent>({ kind: 'reset', state: { version: 1, view: { ...view, actingPlayers: ['user-2', 'user-3'] }, actions: {} } }))],
};

export const Empty: Story = {
  decorators: [withEvents(of<MemberStateEvent>({ kind: 'reset', state: null }))],
};

// Chromatic pauses a CSS animation at the end of its cycle, and `skeleton` is infinite — it has no
// end, so the captured frame is arbitrary. `false` pins it to the first frame instead.
export const Loading: Story = {
  parameters: {
    chromatic: { pauseAnimationAtEnd: false },
  },
  decorators: [withEvents(NEVER)],
};
