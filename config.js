module.exports = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT || 755,
	URL: process.env.NODE_ENV === "production" ? "https://atomate.co/" : "http://localhost:755/",
	MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/atomate-dev",
	CHANNEL_FETCH_INTERVAL_IN_MINUTES: 30,
};
