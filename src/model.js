const { scheduleChannelFetch } = require("./scheduler");
const { rssParser } = require("./rssParser");
const utils = require("./utils");

const config = require("../config");

const { Channels, Items } = require("./collections").getInstance();

const createChannel = async (req, res, next) => {
	try {
		const inputURL = req.body.input;
		let inputFeedURL = inputURL;

		// Check if this is a valid URL
		const isValidURL = utils.isValidURL(inputURL);
		if (!isValidURL) return utils.httpError(400, "Invalid URL");

		// Check if the given URL is a valid RSS URL
		let urlContents = await utils.getURLContents(inputURL);
		let _xmlJSON = await utils.xmlTOJSON(urlContents);
		let isRssFeed = utils.isRSSFeed(_xmlJSON);

		// If the given URL is not a RSS or Atom URL
		// find RSS or Atom feed URL from the link tags
		if (!isRssFeed) {
			inputFeedURL = await utils.findFeedURL(inputURL);
		}

		if (!inputFeedURL) return utils.httpError(400, "Unable to find RSS or ATOM feed for the given URL");
		const channalFetchIntervalInMinutes = config.CHANNEL_FETCH_INTERVAL_IN_MINUTES ?? 30;

		// Fetch
		urlContents = await utils.getURLContents(inputFeedURL);
		_xmlJSON = await utils.xmlTOJSON(urlContents);
		isRssFeed = utils.isRSSFeed(_xmlJSON);
		if (!isRssFeed) return utils.httpError(400, "Invalid RSS feed");

		const rssFeed = rssParser(_xmlJSON, inputFeedURL);

		let channel = await utils.getChannel(rssFeed.link);
		if (channel) {
			await utils.saveChannel(rssFeed, channalFetchIntervalInMinutes);
			return res.json({ message: "Channel details", channel });
		}

		channel = await utils.saveChannel(rssFeed, channalFetchIntervalInMinutes);

		// Initialize the scheduler
		scheduleChannelFetch(channel);

		const { _id, title, link, description, feedURL, image } = channel;
		res.json({ message: "Channel created", channel: { _id, title, link, description, feedURL, image } });
	} catch (error) {
		next(error);
	}
};
const getChannel = async (req, res, next) => {
	try {
		const channelId = req.params.channelId;
		const searchString = req.query.query;

		const skip = Number(req.query.skip) || 0;

		let query = { channel: channelId };
		if (searchString) query["$text"] = { $search: searchString };

		const [channel, items] = await Promise.all([
			Channels.findOne({ _id: channelId }).select("link feedURL title description image").exec(),
			Items.find(query)
				.select("id title author channel publishedOn")
				.populate("channel", "link feedURL title description image")
				.skip(skip)
				.limit(50)
				.sort("-publishedOn")
				.exec(),
		]);

		res.json({ channel, items });
	} catch (error) {
		next(error);
	}
};

const getItems = async (req, res, next) => {
	try {
		const channelIds = req.query.channels ? req.query.channels.split(",") : [];
		const skip = Number(req.query.skip) || 0;
		const searchString = req.query.query;

		let query = { channel: { $in: channelIds } };
		if (searchString) query["$text"] = { $search: searchString };

		const items = await Items.find(query)
			.select("id title author channel publishedOn")
			.populate("channel", "title description image")
			.skip(skip)
			.limit(50)
			.sort("-publishedOn")
			.exec();

		res.json({ items });
	} catch (error) {
		next(error);
	}
};

const getItem = async (req, res, next) => {
	try {
		const itemId = req.params.itemId;

		const item = await Items.findOne({ _id: itemId })
			.select("id title description content author channel imageUrl publishedOn")
			.populate("channel", "link feedURL title description image")
			.exec();

		res.json({ item });
	} catch (error) {
		next(error);
	}
};

module.exports = { createChannel, getChannel, getItems, getItem };
