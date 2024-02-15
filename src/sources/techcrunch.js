module.exports = {
	name: "Techcrunch",
	description: "Startup & Technology News. An unofficial source which uses Techcrunch's RSS feed",
	image: "/assets/logos/techcrunch.svg",
	requiresInput: false,
	helpHTML: "",
	getFeedURL: async () => {
		return "https://techcrunch.com/feed";
	},
};
