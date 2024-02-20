const { getURLContents } = require("../utils");

const { JSDOM } = require("jsdom");

module.exports = {
	name: "Youtube",
	description: "Subscribe to any Youtube channel.",
	image: "/assets/logos/youtube.png",
	requiresInput: true,
	inputLabel: "Youtube channel link",
	helpHTML:
		"Add any Youtube channel link. Eg: https://www.youtube.com/@TheJoannaAlexis or https://www.youtube.com/channel/UC2PJ8Df-l4tgpwuREw-xW2w",
	channalFetchIntervalInMinutes: 30,
	getFeedURL: async (channelLink) => {
		if (!channelLink) return;

		const urlContents = await getURLContents(channelLink);
		const dom = new JSDOM(urlContents);

		const feedURL = dom.window.document.querySelector("link[type='application/rss+xml']").href;
		if (!feedURL) return;

		return feedURL;
	},
};
