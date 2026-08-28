import { formatDurationShort } from './format-duration';

describe('formatDurationShort', () => {
  it('retorna — para null', () => {
    expect(formatDurationShort(null)).toBe('—');
  });

  it('retorna — para 0', () => {
    expect(formatDurationShort(0)).toBe('—');
  });

  it('retorna — para undefined', () => {
    expect(formatDurationShort(undefined)).toBe('—');
  });

  it('retorna — para valor negativo', () => {
    expect(formatDurationShort(-120)).toBe('—');
  });

  it('formata menos de 60 min como "N min"', () => {
    expect(formatDurationShort(1800)).toBe('30 min');
  });

  it('formata >= 60 min como "Hh MM" com minutos zero-padded', () => {
    expect(formatDurationShort(3900)).toBe('1h 05');
  });

  it('formata duração longa corretamente', () => {
    expect(formatDurationShort(9000)).toBe('2h 30');
  });
});
