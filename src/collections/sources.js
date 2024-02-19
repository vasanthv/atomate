const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = new Schema({
	name: String,
	key: { type: String, index: true, unique: true },
	description: String,
	image: String,
	createdOn: { type: Date, default: Date.now },
	requiresInput: Boolean,
	inputLabel: String,
	helpHTML: String,
});
