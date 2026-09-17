import { cronJobs } from 'convex/server';
import { api } from './_generated/api';

const crons = cronJobs();

// Poll RCB every 5 minutes
crons.interval('poll rcb komunikaty', { minutes: 5 }, api.rcbPoller.pollRcb);

// Poll alerts.in.ua every 30 seconds. Their documented ceiling is 30 requests
// per 10 minutes (1 per 20s); 30s leaves headroom so a retry cannot trip it.
crons.interval(
	'poll alerts.in.ua western oblasts',
	{ seconds: 30 },
	api.alertsInUaPoller.pollAlertsInUa
);

// Poll news RSS feeds every 10 minutes (balanced between freshness and politeness)
crons.interval('poll news rss feeds', { minutes: 10 }, api.newsRssPoller.pollNewsRss);

export default crons;
