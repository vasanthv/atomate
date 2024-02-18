const { rssParser } = require("./rss-parser");
const sources = require("./sources");
const helper = require("./helper");

const createChannel = async (req, res, next) => {
	try {
		const sourceKey = req.body.source;
		const source = sources[sourceKey];
		if (!source) return helper.httpError(400, "Invalid source");

		const sourceInput = req.body.input;

		const _feedURL = await source.getFeedURL(sourceInput);

		const urlContents = await helper.getURLContents(_feedURL);

		const _xmlJSON = await helper.xmlTOJSON(urlContents);

		const isRssFeed = helper.isRSSFeed(_xmlJSON);
		if (!isRssFeed) return helper.httpError(400, "Invalid RSS feed");

		const rssFeed = rssParser(_xmlJSON, _feedURL);

		const { title, link, description, feedURL, image } = await helper.addOrUpdateFeed(rssFeed);

		res.send({ message: "Channel created", channel: { title, link, description, feedURL, image } });
	} catch (error) {
		next(error);
	}
};

module.exports = { createChannel };
