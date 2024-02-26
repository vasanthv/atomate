/**
 * A singleton implemetaion for the database collections
 */

const mongoose = require("mongoose");
const config = require("../config");

module.exports = (() => {
	let instance;
	let db = mongoose.connection;
	const Schema = mongoose.Schema;

	mongoose.set("strictQuery", true);

	const connectToDb = () => {
		mongoose.connect(config.MONGODB_URI, {
			useNewUrlParser: true,
		});
	};

	const createInstance = () => {
		db.on("error", (error) => {
			console.error("Error in MongoDb connection: " + error);
			mongoose.disconnect(); // Trigger disconnect on any error
		});
		db.on("connected", () => console.log("Atomate DB connected"));
		db.on("disconnected", () => {
			console.log("MongoDB disconnected!");
			connectToDb();
		});

		connectToDb();

		console.log("Atomate DB initialized");

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

		const itemSchema = new Schema({
			id: { type: String, index: true, required: true },
			channel: { type: Schema.Types.ObjectId, ref: "Channels", index: true },
			title: String,
			description: String,
			link: { type: String, required: true },
			author: String,
			publishedOn: Date,
			updatedOn: Date,
			createdOn: Date,
			content: String,
			imageUrl: String,
			fetchedOn: Date,
		});
		itemSchema.index({ title: "text", description: "text" });

		const Channels = mongoose.model("Channels", channelSchema);
		const Items = mongoose.model("Items", itemSchema);

		return { Channels, Items };
	};
	return {
		getInstance: () => {
			if (!instance) {
				instance = createInstance();
			}
			return instance;
		},
	};
})();
