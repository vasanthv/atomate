const sources = require("../sources");

const { Sources } = require("../collections").getInstance();
/*
 * Registers all sources from ./sources folder in the datebase
 * No updates. Only creation.
 */
module.exports = async () => {
	const sourceRegistrationPromises = Object.keys(sources).map((key) => {
		const source = sources[key];
		const { name, description, image, requiresInput, helpHTML } = source;

		const updateFields = { name, description, image, requiresInput, helpHTML };
		// Upsert the document
		return Sources.findOneAndUpdate({ key }, updateFields, {
			new: true,
			upsert: true, // Make this update into an upsert
		});
	});

	await Promise.all(sourceRegistrationPromises);
};
