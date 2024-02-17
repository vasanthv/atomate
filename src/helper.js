const rateLimiter = require("express-rate-limit");
const { XMLParser } = require("fast-xml-parser");
const slowDown = require("express-slow-down");
const axios = require("axios");

const config = require("../config");
const { Channels, Items } = require("./collections").getInstance();

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
const addOrUpdateFeed = async (rss) => {
	const { items, ...channel } = rss;

	const results = await Promise.all([upsertChannel(channel), upsertItems(items)]);
	console.log(results);
};
const upsertChannel = async (channel) => {
	const { title, description, link, image, feedURL } = channel;

	return Channels.findOneAndUpdate({ link }, { title, description, image, feedURL }, { new: true, upsert: true });
};

const upsertItems = async (rssItems, channelId) => {
	const itemPromises = rssItems.map((rssItem) => {
		const { id, title, description, link, author, published, updated, content, media, enclosures } = rssItem;
		const imageUrl = media?.thumbnail?.url ?? enclosures.length > 0 ? enclosures[0].url : undefined;
		return Items.findOneAndUpdate(
			{ id },
			{ title, description, link, author, published, updated, content, imageUrl, channel: channelId },
			{ new: true, upsert: true }
		);
	});

	return Promise.all(itemPromises);
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
	getURLContents,
	xmlTOJSON,
	isRSSFeed,
	csrfValidator,
	rateLimit,
	speedLimiter,
	addOrUpdateFeed,
	httpError,
};
