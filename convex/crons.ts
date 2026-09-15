import { cronJobs } from 'convex/server';
import { api } from './_generated/api';

const crons = cronJobs();

// Poll RCB every 5 minutes
crons.interval('poll rcb komunikaty', { minutes: 5 }, api.rcbPoller.pollRcb);

// Poll alerts.in.ua every 25 seconds (soft rate limit ~2.4 req/min)
crons.interval(
	'poll alerts.in.ua western oblasts',
	{ seconds: 25 },
	api.alertsInUaPoller.pollAlertsInUa
);

export default crons;
