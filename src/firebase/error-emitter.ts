
import { EventEmitter } from 'events';

// Since we're in a single-threaded environment (Node.js or Browser),
// a simple event emitter is sufficient.
export const errorEmitter = new EventEmitter();
