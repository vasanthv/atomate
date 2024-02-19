const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const channelSchema = new Schema({
	link: { type: String, index: true, required: true, unique: true },
	feedURL: { type: String, index: true, required: true, unique: true },
	title: String,
	description: String,
	image: String,
	createdOn: { type: Date, default: Date.now },
	lastFetchedOn: Date, // Last successful fetch of the RSS feed
	lastUpdatedOn: Date, // Last update happened on the RSS feed
	fetchIntervalInMinutes: { type: Number, default: 60 },
});

module.exports = channelSchema;
