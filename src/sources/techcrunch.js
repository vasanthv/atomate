module.exports = {
	name: "Techcrunch",
	description: "Startup & Technology News.",
	image: "/assets/logos/techcrunch.png",
	requiresInput: false,
	helpHTML: "",
	getFeedURL: async () => {
		return "https://techcrunch.com/feed";
	},
};
