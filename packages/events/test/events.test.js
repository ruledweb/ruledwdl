import assert from 'node:assert';
import {
  createEventAdapter,
  registerEvent,
  registerModifier,
  listEvents,
  listModifiers
} from '../src/index.js';

console.log('Running @ruledwdl/events unit tests...');

// Test 1: Default events & modifiers lists
const events = listEvents();
assert(events.includes('click'), 'Should contain click event');
assert(events.includes('keydown'), 'Should contain keydown event');
assert(events.includes('input'), 'Should contain input event');

const modifiers = listModifiers();
assert(modifiers.includes('prevent'), 'Should contain prevent modifier');
assert(modifiers.includes('stop'), 'Should contain stop modifier');
assert(modifiers.includes('once'), 'Should contain once modifier');

// Test 2: Custom event registration
registerEvent('swipedleft');
assert(listEvents().includes('swipedleft'), 'Should contain custom swipedleft event');

// Test 3: Custom modifier registration
let customModExecuted = false;
registerModifier('customtest', (ev, el) => {
  customModExecuted = true;
});
assert(listModifiers().includes('customtest'), 'Should contain customtest modifier');

// Test 4: Adapter instantiation
const adapter = createEventAdapter({
  root: {},
  handlers: {
    testHandler: () => {}
  }
});
assert.strictEqual(adapter.size, 0, 'Initial cleanup size should be 0');
assert.strictEqual(typeof adapter.bind, 'function', 'adapter.bind should be a function');
assert.strictEqual(typeof adapter.unbind, 'function', 'adapter.unbind should be a function');

console.log('PASS — @ruledwdl/events unit tests passed cleanly!');
