const uuid = require("uuid").v4;

const { scheduleChannelFetch } = require("./scheduler");
const { rssParser } = require("./rssParser");
const sources = require("./sources");
const utils = require("./utils");

const { Channels, Devices, Items, Sources } = require("./collections").getInstance();

const createChannel = async (req, res, next) => {
	try {
		const sourceKey = req.body.source;
		const source = sources[sourceKey];
		if (!source) return utils.httpError(400, "Invalid source");

		const sourceInput = req.body.input;

		const _feedURL = await source.getFeedURL(sourceInput);
		if (!_feedURL) return utils.httpError(400, "Invalid input");
		const channalFetchIntervalInMinutes = source.channalFetchIntervalInMinutes ?? 60;

		const urlContents = await utils.getURLContents(_feedURL);

		const _xmlJSON = await utils.xmlTOJSON(urlContents);

		const isRssFeed = utils.isRSSFeed(_xmlJSON);
		if (!isRssFeed) return utils.httpError(400, "Invalid RSS feed");

		const rssFeed = rssParser(_xmlJSON, _feedURL);

		let channel = await utils.getChannel(rssFeed.link);
		if (channel) return res.json({ message: "Channel details", channel });

		channel = await utils.saveChannel(rssFeed, channalFetchIntervalInMinutes);

		// Initialize the scheduler
		scheduleChannelFetch(channel);

		const { title, link, description, feedURL, image } = channel;
		res.json({ message: "Channel created", channel: { title, link, description, feedURL, image } });
	} catch (error) {
		next(error);
	}
};

const getItems = async (req, res, next) => {
	try {
		const channelLinks = await utils.getChannelLinks(req.body.channels);
		const skip = Number(req.query.skip) || 0;

		const channels = await Channels.find({ link: { $in: channelLinks } })
			.select("_id")
			.exec();

		const items = await Items.find({ channel: { $in: channels.map((c) => c._id) } })
			.select("id title description content author channel imageUrl publishedOn")
			.populate("channel", "link feedURL title description image")
			.skip(skip)
			.limit(50)
			.sort("-publishedOn")
			.exec();

		res.json({ items });
	} catch (error) {
		next(error);
	}
};
const getSources = async (req, res, next) => {
	try {
		const sources = await Sources.find({}).exec();

		res.json({ sources });
	} catch (error) {
		next(error);
	}
};

const updatePushCredentials = async (req, res, next) => {
	try {
		let deviceId = req.body.deviceId;
		const pushCredentials = req.body.credentials;
		if (!pushCredentials) return utils.httpError(400, "Invalid inputs");

		if (!deviceId) {
			deviceId = uuid();
			await new Devices({ deviceId, createdOn: new Date() }).save();
		}

		await Devices.updateOne({ deviceId }, { pushCredentials, updatedOn: new Date() });

		res.json({ message: "Push credentials updated" });
	} catch (error) {
		next(error);
	}
};

const pushSubscribeChannel = async (req, res, next) => {
	try {
		let deviceId = req.body.deviceId;
		const channelLink = req.body.link;
		if (!channelLink) return utils.httpError(400, "Channel link is empty");

		const channel = await Channels.findOne({ link: channelLink }).exec();
		if (!channel) return utils.httpError(400, "Invalid channel link");

		await Devices.updateOne({ deviceId }, { $push: { subscribedChannels: channel._id, updatedOn: new Date() } });

		res.json({ message: "Channel subscribed to push notification" });
	} catch (error) {
		next(error);
	}
};

const pushUnsubscribeChannel = async (req, res, next) => {
	try {
		let deviceId = req.body.deviceId;
		const channelLink = req.body.link;
		if (!channelLink) return utils.httpError(400, "Channel link is empty");

		const channel = await Channels.findOne({ link: channelLink }).exec();
		if (!channel) return utils.httpError(400, "Invalid channel link");

		await Devices.updateOne({ deviceId }, { $pull: { subscribedChannels: channel._id }, updatedOn: new Date() });

		res.json({ message: "Channel unsubscribed from push notification" });
	} catch (error) {
		next(error);
	}
};

module.exports = {
	createChannel,
	getItems,
	getSources,
	updatePushCredentials,
	pushSubscribeChannel,
	pushUnsubscribeChannel,
};
