const { Readability, isProbablyReaderable } = require("@mozilla/readability");
const { XMLParser } = require("fast-xml-parser");
const createDOMPurify = require("dompurify");
const webPush = require("web-push");
const { JSDOM } = require("jsdom");
const axios = require("axios");

const { Channels, Devices, Items } = require("./collections").getInstance();
const { rssParser } = require("./rssParser");
const config = require("../config");

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
		if (!title) title = (description ?? "Untitled").replace(/(<([^>]+)>)/gi, "");
		const publishedOn = published;
		const updatedOn = updated;

		const isAlreadySaved = await Items.findOne({ id }).exec();

		if (isAlreadySaved && isAlreadySaved.updatedOn?.getTime() === updatedOn?.getTime()) return;
		isUpdateAvailable = true;
		notifySubscribers(channelId, title, id);

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
	const dom = await JSDOM.fromURL(url, {});
	if (!isProbablyReaderable(dom.window.document)) return "";
	let reader = new Readability(dom.window.document).parse();
	const DOMPurify = createDOMPurify(dom.window);

	return DOMPurify.sanitize(reader.content);
};

/* Send push notifications to subscribers */
const notifySubscribers = async (channelId, content, itemId) => {
	const [devices, channel] = await Promise.all([
		Devices.find({ channel: channelId }).exec(),
		Channels.findOne({ _id: channelId }).exec(),
	]);

	const pushPromises = devices.map((device) => {
		const url = `${config.URL}read?id=${encodeURIComponent(itemId)}`;
		return sendPushNotification(device.pushCredentials, channel.title, content, url);
	});

	return Promise.all(pushPromises);
};
const sendPushNotification = async (pushCredentials, title, body, url) => {
	const payload = JSON.stringify({ title, body, url });

	try {
		await webPush.sendNotification(pushCredentials, payload, config.PUSH_OPTIONS);
	} catch (err) {
		console.error(err);
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
	getChannelLinks,
	getURLContents,
	xmlTOJSON,
	isRSSFeed,
	updateChannelFeed,
	getChannel,
	saveChannel,
	httpError,
};
