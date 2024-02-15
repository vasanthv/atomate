module.exports = new Schema({
	deviceId: String,
	pushCredentials: Object,
	subscribedChannels: [{ type: Schema.Types.ObjectId, ref: "Channels", index: true }],
	createdOn: Date,
});
