module.exports = {
	name: "Mastodon",
	description: "A free and open-source decentralized social media platform.",
	image: "/assets/logos/mastodon.png",
	requiresInput: true,
	inputLabel: "Mastodon profile link",
	helpHTML: "Add your Mastodan profile URL. Eg: https://mastodon.social/@vasanthv",
	channalFetchIntervalInMinutes: 60,
	getFeedURL: async (profileLink) => {
		if (!profileLink) return;
		return `${profileLink.replace(/\/$/, "")}.rss`;
	},
};
