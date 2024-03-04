const { Readability, isProbablyReaderable } = require("@mozilla/readability");
const { XMLParser } = require("fast-xml-parser");
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const axios = require("axios");

const { Channels, Items } = require("./collections").getInstance();
const { rssParser } = require("./rssParser");

const isValidURL = (url) => {
	try {
		const _url = new URL(url);
		return ["http:", "https:"].includes(_url.protocol) ? Boolean(_url) : false;
	} catch (e) {
		return false;
	}
};

const findFeedURL = async (url) => {
	const urlContents = await getURLContents(url);
	const dom = new JSDOM(urlContents);

	const feedTag =
		dom.window.document.querySelector("link[type='application/rss+xml']") ??
		dom.window.document.querySelector("link[type='application/atom+xml']");

	if (!feedTag) return;
	let feedURL = feedTag.href;
	if (!feedURL.startsWith("http")) {
		feedURL = new URL(feedURL, url).href;
	}

	return feedURL;
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

/* DB Helpers */
const getChannel = async (_link) => {
	const channel = await Channels.findOne({ link: _link }).exec();
	if (!channel) return false;
	const { _id, title, link, description, feedURL, image } = channel;
	return { _id, title, link, description, feedURL, image };
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
		if (!title) title = (description ?? "Untitled").replace(/(<([^>]+)>)/gi, "");
		const publishedOn = published;
		const updatedOn = updated;

		const isAlreadySaved = await Items.findOne({ id }).exec();

		if (isAlreadySaved && isAlreadySaved.updatedOn?.getTime() === updatedOn?.getTime()) return;
		isUpdateAvailable = true;

		if (!content) content = await getReadableContent(link);
		return Items.findOneAndUpdate(
			{ id },
			{ title, description, link, author, publishedOn, updatedOn, content, imageUrl, channel: channelId },
			{ new: true, upsert: true }
		);
	});

	// This rss feed has some new items to update.
	if (isUpdateAvailable) {
		await Channels.updateOne({ _id: channelId }, { lastUpdatedOn: new Date() });
	}

	return Promise.all(itemPromises);
};

const getReadableContent = async (url) => {
	try {
		const dom = await JSDOM.fromURL(url, {});
		if (!isProbablyReaderable(dom.window.document)) return "";
		let reader = new Readability(dom.window.document).parse();
		const DOMPurify = createDOMPurify(dom.window);

		return DOMPurify.sanitize(reader.content);
	} catch (err) {
		console.error("Unable to get readable content.", url);
	}
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
	isValidURL,
	findFeedURL,
	getURLContents,
	xmlTOJSON,
	isRSSFeed,
	updateChannelFeed,
	getChannel,
	saveChannel,
	httpError,
};
