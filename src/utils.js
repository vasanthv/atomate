const rateLimiter = require("express-rate-limit");
const { XMLParser } = require("fast-xml-parser");
const slowDown = require("express-slow-down");
const { rssParser } = require("./rssParser");
const axios = require("axios");
var { Readability, isProbablyReaderable } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");

const config = require("../config");
const { Channels, Items } = require("./collections").getInstance();

const getChannelLinks = async (links) => {
	if (!Array.isArray(links)) return [];
	const channelLinks = links.filter(isValidUrl);
	return channelLinks;
};

const isValidUrl = (url) => {
	try {
		const _url = new URL(url);
		return ["http:", "https:"].includes(_url.protocol) ? Boolean(_url) : false;
	} catch (e) {
		return false;
	}
};

const getURLContents = async (url) => {
	try {
		const { data, status, statusText } = await axios(url);
		if (statusText !== "OK") return httpError(400, `Unable to fetch feed. Error code: ${status}`);
		return data;
	} catch (err) {
		httpError(400, `Error while fetching feed. Error code: ${err.response.status}`);
	}
};

const xmlTOJSON = (data) => {
	const xmlParser = new XMLParser({
		attributeNamePrefix: "",
		textNodeName: "$text",
		ignoreAttributes: false,
	});

	return xmlParser.parse(data);
};

const isRSSFeed = (data) => {
	return !!(data.rss?.channel ? data.rss.channel : data.feed);
};

/* Middlewares */
const csrfValidator = async (req, res, next) => {
	if (config.DISABLE_CSRF || req.method === "GET" || req.headers["x-api-key"] || req.headers["X-API-KEY"]) {
		return next();
	}
	if (!req.session.csrfs?.some((csrf) => csrf.token === req.headers["x-csrf-token"])) {
		return res.status(400).json({ message: "Page expired. Please refresh and try again" });
	}
	next();
};
const rateLimit = (options) => {
	return rateLimiter({
		max: 50,
		...options,
		windowMs: (options?.windowMs || 5) * 60 * 1000, // in minutes
		handler: (req, res) =>
			res.status(429).json({ message: `Too many requests. Try again after ${options?.windowMs || 5} mins` }),
	});
};
const speedLimiter = slowDown({
	windowMs: 15 * 60 * 1000, // 15 minutes
	delayAfter: 20, // allow 100 requests per 15 minutes, then...
	delayMs: () => 500, // begin adding 500ms of delay per request above 20
});

/* DB Helpers */
const getChannel = async (_link) => {
	const channel = await Channels.findOne({ link: _link }).exec();
	if (!channel) return false;
	const { title, link, description, feedURL, image } = channel;
	return { title, link, description, feedURL, image };
};

const updateChannelFeed = async (channel) => {
	const urlContents = await getURLContents(channel.feedURL);

	const _xmlJSON = await xmlTOJSON(urlContents);

	const isRssFeed = isRSSFeed(_xmlJSON);
	if (!isRssFeed) return;

	const rssFeed = rssParser(_xmlJSON, channel.feedURL);

	await Channels.updateOne({ _id: channel._id }, { lastFetchedOn: new Date() });
	saveItems(rssFeed.items, channel._id);
};

const saveChannel = async (channel, fetchIntervalInMinutes = 60) => {
	const { title, description, link, image, feedURL } = channel;

	return Channels.findOneAndUpdate(
		{ link },
		{ title, description, image, feedURL, fetchIntervalInMinutes },
		{ new: true, upsert: true }
	);
};

const saveItems = async (rssItems, channelId) => {
	let isUpdateAvailable = false;
	const itemPromises = rssItems.map(async (rssItem) => {
		let { id, title, description, link, author, published, updated, content, media, enclosures } = rssItem;

		const imageUrl = media?.thumbnail?.url ?? enclosures.length > 0 ? enclosures[0].url : undefined;

		const isAlreadySaved = await Items.findOne({ id }).exec();
		if (isAlreadySaved && isAlreadySaved.updated === updated) return;
		isUpdateAvailable = true;

		if (!content) content = await getContent(link);
		return Items.findOneAndUpdate(
			{ id },
			{ title, description, link, author, published, updated, content, imageUrl, channel: channelId },
			{ new: true, upsert: true }
		);
	});

	// This rss feed has some new items to update.
	if (isUpdateAvailable) {
		await Channels.updateOne({ _id: channelId }, { lastUpdatedOn: new Date() });
	}

	return Promise.all(itemPromises);
};

const getContent = async (url) => {
	const dom = await JSDOM.fromURL(url, {});
	if (!isProbablyReaderable(dom.window.document)) return "";

	let reader = new Readability(dom.window.document).parse();

	const DOMPurify = createDOMPurify(dom.window);

	return DOMPurify.sanitize(reader.content);
};

//Throws a error which can be handled and changed to HTTP Error in the Express js Error handling middleware.
const httpError = (code, message) => {
	code = code ? code : 500;
	message = message ? message : "Something went wrong";
	const errorObject = new Error(message);
	errorObject.httpErrorCode = code;
	throw errorObject;
};

module.exports = {
	getChannelLinks,
	getURLContents,
	xmlTOJSON,
	isRSSFeed,
	csrfValidator,
	rateLimit,
	speedLimiter,
	updateChannelFeed,
	getChannel,
	saveChannel,
	httpError,
};
