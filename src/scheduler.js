const cron = require("node-cron");

const { Channels } = require("./collections").getInstance();

const utils = require("./utils");

const initAllChannelsFetch = async () => {
	const channels = await Channels.find({}).exec();

	channels.forEach(scheduleChannelFetch);
};

const scheduleChannelFetch = (channel) => {
	console.log(`Job scheduled for ${channel.link}, runs every ${channel.fetchIntervalInMinutes} minutes`);
	const updateChannelFeed = async () => {
		console.log(`running the scheduled task for ${channel.link}`);
		await utils.updateChannelFeed(channel);
	};
	cron.schedule(`*/${channel.fetchIntervalInMinutes ?? 60} * * * *`, updateChannelFeed);
	// always run the fetch while scheduling
	updateChannelFeed();
};

module.exports = { initAllChannelsFetch, scheduleChannelFetch };
