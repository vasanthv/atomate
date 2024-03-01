const cron = require("node-cron");

const { Channels } = require("./collections").getInstance();

const utils = require("./utils");

const initAllChannelsFetch = async () => {
	// Ignore Channels that did not got updated in the last 30 dates
	const lastMonthDate = new Date();
	lastMonthDate.setDate(lastMonthDate.getDate() - 30);

	const channels = await Channels.find({ lastFetchedOn: { $gte: lastMonthDate } }).exec();

	channels.forEach(scheduleChannelFetch);
};

const scheduleChannelFetch = (channel) => {
	try {
		console.log(`Job scheduled for ${channel.link}, runs every ${channel.fetchIntervalInMinutes} minutes`);
		const updateChannelFeed = async () => {
			console.log(`running the scheduled task for ${channel.link}`);
			await utils.updateChannelFeed(channel);
		};
		cron.schedule(`*/${channel.fetchIntervalInMinutes ?? 60} * * * *`, updateChannelFeed);
		// always run the fetch while scheduling
		updateChannelFeed();
	} catch (err) {
		console.error(err);
	}
};

module.exports = { initAllChannelsFetch, scheduleChannelFetch };
