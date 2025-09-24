import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import {
  DEFAULT_SETTINGS,
  SettingsService,
  STORAGE_KEY_SUFFIX,
} from './settings.service';

interface TestModel {
  someKey: string;
  otherKey: number;
}

const defaultModel = {
  someKey: 'someKey',
  otherKey: 12,
};

describe('SettingsService', () => {
  let service: SettingsService<TestModel>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: DEFAULT_SETTINGS,
          useValue: defaultModel,
        },
        {
          provide: STORAGE_KEY_SUFFIX,
          useValue: 'test',
        },
      ],
    });
    localStorage.clear();
  });

  it('should be created', () => {
    service = TestBed.inject<SettingsService<TestModel>>(
      SettingsService<TestModel>,
    );

    expect(service).toBeTruthy();
  });

  it('should load from storage', () => {
    localStorage.setItem('ahlcg_test', JSON.stringify({ someKey: 'test' }));
    service = TestBed.inject<SettingsService<TestModel>>(
      SettingsService<TestModel>,
    );
    const data = service.get()();

    expect(data).toEqual({
      someKey: 'test',
      otherKey: 12,
    });
  });

  it('should save to storage', () => {
    service = TestBed.inject<SettingsService<TestModel>>(
      SettingsService<TestModel>,
    );
    service.update('otherKey', 46);

    expect(service.get()()).toEqual({
      someKey: 'someKey',
      otherKey: 46,
    });

    TestBed.tick();

    expect(JSON.parse(localStorage.getItem('ahlcg_test') ?? '')).toEqual({
      otherKey: 46,
    });
  });

  it('should set default on error', () => {
    localStorage.setItem('ahlcg_test', 'abab');
    service = TestBed.inject<SettingsService<TestModel>>(
      SettingsService<TestModel>,
    );

    expect(service.get()()).toEqual(defaultModel);
  });

  it('should set default on missing value', () => {
    service = TestBed.inject<SettingsService<TestModel>>(
      SettingsService<TestModel>,
    );

    expect(service.get()()).toEqual(defaultModel);
  });
});
