const channelSchema = new Schema({
	link: { type: String, index: true, required: true },
	title: String,
	description: String,
	image: String,
	createdOn: Date,
	lastFetchedOn: Date,
	fetchIntervalInMinutes: { type: Number, default: 60 },
});

module.exports = channelSchema;
