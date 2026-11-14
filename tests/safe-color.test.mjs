import test from 'node:test';
import assert from 'node:assert/strict';
import { safeColor } from '../data-utils.mjs';

test('safeColor preserves a valid hex color', () => {
  assert.equal(safeColor('#35b8a6'), '#35b8a6');
});

test('safeColor rejects markup and malformed CSS values', () => {
  assert.equal(safeColor('red;" onload="alert(1)'), '#6878ef');
  assert.equal(safeColor('var(--theme)'), '#6878ef');
  assert.equal(safeColor(null), '#6878ef');
});
