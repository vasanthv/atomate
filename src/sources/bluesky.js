const { getURLContents } = require("../utils");

const { JSDOM } = require("jsdom");

module.exports = {
	name: "Bluesky",
	description: "A microblogging social platform.",
	image: "/assets/logos/bluesky.png",
	requiresInput: true,
	inputLabel: "Bluesky profile link",
	helpHTML: "Add your Bluesky profile URL. Eg: https://bsky.app/profile/vasanthv.bsky.social",
	channalFetchIntervalInMinutes: 60,
	getFeedURL: async (profileLink) => {
		if (!profileLink) return;

		const urlContents = await getURLContents(profileLink);
		const dom = new JSDOM(urlContents);

		const feedURL = dom.window.document.querySelector("link[type='application/rss+xml']").href;
		if (!feedURL) return;

		return feedURL;
	},
};
