module.exports = new Schema({
	name: String,
	uniqueId: { type: String, index: true, unique: true },
	description: String,
	image: String,
	createdOn: Date,
	requiresInput: Boolean,
	helpHTML: String,
});
