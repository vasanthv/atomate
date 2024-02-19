module.exports = {
	name: "Techcrunch",
	description: "Subscribe for startup & technology news.",
	image: "/assets/logos/techcrunch.png",
	requiresInput: false,
	helpHTML: "",
	channalFetchIntervalInMinutes: 15,
	getFeedURL: async () => {
		return "https://techcrunch.com/feed";
	},
};
