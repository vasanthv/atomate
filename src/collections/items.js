const mongoose = require("mongoose");

const itemSchema = new Schema({
	id: { type: String, index: true, required: true },
	channel: { type: Schema.Types.ObjectId, ref: "Channels", index: true },
	title: String,
	description: String,
	link: { type: String, required: true },
	author: String,
	publishedOn: Date,
	createdOn: Date,
	content: String,
	enclosures: Object,
	fetchedOn: Date,
});

itemSchema.index({ title: "text", description: "text", content: "text" });

module.exports = itemSchema;
