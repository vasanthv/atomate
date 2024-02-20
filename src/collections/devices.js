const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = new Schema({
	deviceId: String,
	pushCredentials: Object,
	subscribedChannels: [{ type: Schema.Types.ObjectId, ref: "Channels", index: true }],
	createdOn: Date,
	updatedOn: Date,
});
