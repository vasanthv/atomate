module.exports = {
	name: "The Next Web",
	description: "The heart of tech. Subscribe for latest tech news.",
	image: "/assets/logos/thenextweb.png",
	requiresInput: false,
	helpHTML: "",
	channalFetchIntervalInMinutes: 10,
	getFeedURL: async () => {
		return "https://thenextweb.com/feed";
	},
};
