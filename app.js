import {setupAccount} from './account.js';
if(setupAccount())await import('./dashboard.js');