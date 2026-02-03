/**
 * Smoke test to verify testing infrastructure works
 */

import { describe, it, expect } from 'vitest';

describe('Test Infrastructure', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have jest-dom matchers available', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello';
    document.body.appendChild(div);

    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent('Hello');

    document.body.removeChild(div);
  });
});
