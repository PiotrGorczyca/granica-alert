import { cronJobs } from 'convex/server';
import { api } from './_generated/api';

const crons = cronJobs();

// Poll RCB every 5 minutes
crons.interval('poll rcb komunikaty', { minutes: 5 }, api.rcbPoller.pollRcb);

export default crons;
