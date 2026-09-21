import { LangCoverage, resolveAvailableLangs } from './resolve-available-langs';

describe('resolveAvailableLangs', () => {
  const coverage: LangCoverage[] = [
    { id: 'en', label: 'English', coverage: 100 },
    { id: 'es', label: 'Español', coverage: 9 },
    { id: 'de', label: 'Deutsch', coverage: 0 },
  ];

  it('should keep only languages at or above the threshold', () => {
    expect(resolveAvailableLangs(coverage, 90, [])).toEqual([{ id: 'en', label: 'English' }]);
  });

  it('should include an id exactly at the threshold', () => {
    expect(resolveAvailableLangs([{ id: 'ru', label: 'Русский', coverage: 90 }], 90, [])).toEqual([{ id: 'ru', label: 'Русский' }]);
  });

  it('should include an explicit id below the threshold', () => {
    expect(resolveAvailableLangs(coverage, 90, ['de'])).toEqual([
      { id: 'en', label: 'English' },
      { id: 'de', label: 'Deutsch' },
    ]);
  });

  it('should ignore an explicit id the coverage data does not know', () => {
    expect(resolveAvailableLangs(coverage, 90, ['fr'])).toEqual([{ id: 'en', label: 'English' }]);
  });

  it('should not duplicate an explicit id that is already above the threshold', () => {
    expect(resolveAvailableLangs(coverage, 90, ['en'])).toEqual([{ id: 'en', label: 'English' }]);
  });

  it('should union both explicit sources at once', () => {
    expect(resolveAvailableLangs(coverage, 90, ['es', 'de'])).toEqual([
      { id: 'en', label: 'English' },
      { id: 'es', label: 'Español' },
      { id: 'de', label: 'Deutsch' },
    ]);
  });
});
