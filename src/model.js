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
		if (channel) return res.json({ message: "Channel details", channel });

		channel = await utils.saveChannel(rssFeed, channalFetchIntervalInMinutes);

		// Initialize the scheduler
		scheduleChannelFetch(channel);

		const { _id, title, link, description, feedURL, image } = channel;
		res.json({ message: "Channel created", channel: { _id, title, link, description, feedURL, image } });
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

module.exports = { createChannel, getItems };
