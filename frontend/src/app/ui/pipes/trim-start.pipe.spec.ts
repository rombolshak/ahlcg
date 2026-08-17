import { TrimStartPipe } from './trim-start.pipe';

describe('TrimPipe', () => {
  it('create an instance', () => {
    const pipe = new TrimStartPipe();

    expect(pipe).toBeTruthy();
  });

  it('trims one symbol', () => {
    const pipe = new TrimStartPipe();

    expect(pipe.transform('01234', '0')).toEqual('1234');
  });

  it('trims many symbols', () => {
    const pipe = new TrimStartPipe();

    expect(pipe.transform('000001234', '0')).toEqual('1234');
  });

  it('doesnt trim if not needed', () => {
    const pipe = new TrimStartPipe();

    expect(pipe.transform('10234', '0')).toEqual('10234');
  });
});
