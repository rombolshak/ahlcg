import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationsConnectionComponent } from './locations-connection.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { testGameMap } from 'shared/domain/test/test-game-map';

describe('LocationsConnectionComponent', () => {
  let component: LocationsConnectionComponent;
  let fixture: ComponentFixture<LocationsConnectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationsConnectionComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const d1 = document.createElement('div');
    const d2 = document.createElement('div');
    d1.classList.add('loc1');
    d2.classList.add('loc2');
    document.body.appendChild(d1);
    document.body.appendChild(d2);

    fixture = TestBed.createComponent(LocationsConnectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('from', '.loc1');
    fixture.componentRef.setInput('to', '.loc2');
    fixture.componentRef.setInput('fromColor', 'green');
    fixture.componentRef.setInput('map', testGameMap);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should throw if no location found', () => {
    expect(() => {
      const f = TestBed.createComponent(LocationsConnectionComponent);
      f.componentRef.setInput('from', '.test1');
      f.componentRef.setInput('to', '.test2');
      f.componentRef.setInput('map', testGameMap);
      f.detectChanges();
    }).toThrowError('Could not find element by selector .test1');

    expect(() => {
      const f = TestBed.createComponent(LocationsConnectionComponent);
      f.componentRef.setInput('from', '.loc1');
      f.componentRef.setInput('to', '.test2');
      f.componentRef.setInput('map', testGameMap);
      f.detectChanges();
    }).toThrowError('Could not find element by selector .test2');
  });

  it('should display an svg with gradients', () => {
    const svg = fixture.debugElement.query(By.css('svg'));

    expect(svg).toBeTruthy();
    const line = svg.query(By.css('line')).nativeElement as SVGLineElement;

    expect(line.getAttribute('stroke')).toEqual(
      'url(#gradient-green-var_--color-stone-700_)',
    );

    expect(line.getAttribute('marker-start')).toEqual('url(#arrow-green)');
    expect(line.getAttribute('marker-end')).toEqual(
      'url(#arrow-var_--color-stone-700_)',
    );
  });
});
