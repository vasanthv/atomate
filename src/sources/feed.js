module.exports = {
	name: "RSS or Atom feed",
	description: "Any RSS or Atom feed.",
	image: "/assets/logos/feed.png",
	requiresInput: true,
	helpHTML: "",
	channalFetchIntervalInMinutes: 60,
	getFeedURL: async (input) => {
		return input;
	},
};
