import { describe, expect, it } from 'vitest';
import {
  canTransition,
  parseStoredQuestions,
  validateIntakeAnswers,
  type IntakeQuestion,
} from '../../src/modules/jobs/job.js';

const questions: IntakeQuestion[] = [
  { key: 'venue', label: 'Venue', type: 'text', required: true },
  { key: 'guests', label: 'Guest count', type: 'number', required: false },
  {
    key: 'style',
    label: 'Style',
    type: 'choice',
    required: true,
    options: ['Documentary', 'Editorial'],
  },
  { key: 'shoot_date', label: 'Shoot date', type: 'date', required: false },
];

describe('job transitions', () => {
  it('allows the forward path and cancellation', () => {
    expect(canTransition('intake_pending', 'in_progress')).toBe(true);
    expect(canTransition('intake_pending', 'delivered')).toBe(true);
    expect(canTransition('intake_pending', 'cancelled')).toBe(true);
    expect(canTransition('in_progress', 'delivered')).toBe(true);
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
  });

  it('treats delivered and cancelled as terminal', () => {
    expect(canTransition('delivered', 'in_progress')).toBe(false);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'in_progress')).toBe(false);
    expect(canTransition('cancelled', 'delivered')).toBe(false);
  });

  it('never moves backwards from progress to intake', () => {
    expect(canTransition('in_progress', 'intake_pending')).toBe(false);
  });
});

describe('stored intake questions', () => {
  it('reads a valid template', () => {
    expect(parseStoredQuestions(questions)).toHaveLength(4);
  });

  it('returns an empty list for malformed stored data', () => {
    expect(parseStoredQuestions(null)).toEqual([]);
    expect(parseStoredQuestions({})).toEqual([]);
    expect(
      parseStoredQuestions([{ key: 'Venue', label: 'Venue', type: 'text', required: true }]),
    ).toEqual([]);
    expect(
      parseStoredQuestions([{ key: 'style', label: 'Style', type: 'choice', required: true }]),
    ).toEqual([]);
  });
});

describe('intake answers', () => {
  it('accepts complete answers', () => {
    expect(
      validateIntakeAnswers(questions, {
        venue: 'Lekki Hall',
        guests: '120',
        style: 'Documentary',
        shoot_date: '2027-02-14',
      }),
    ).toEqual([]);
  });

  it('requires required answers but not optional ones', () => {
    expect(validateIntakeAnswers(questions, { style: 'Editorial' })).toEqual(['Venue is required']);
    expect(validateIntakeAnswers(questions, { venue: '  ', style: 'Documentary' })).toEqual([
      'Venue is required',
    ]);
  });

  it('rejects unknown keys and invalid choice, number, and date values', () => {
    const errors = validateIntakeAnswers(questions, {
      venue: 'Hall',
      style: 'Cinematic',
      guests: 'many',
      shoot_date: '14/02/2027',
      extra: 'nope',
    });

    expect(errors).toContain('Unknown answer: extra');
    expect(errors).toContain('Style must be one of: Documentary, Editorial');
    expect(errors).toContain('Guest count must be a number');
    expect(errors).toContain('Shoot date must be a date (YYYY-MM-DD)');
  });
});
