/**
 * A singleton implemetaion for the database collections
 */

const mongoose = require("mongoose");
const config = require("../../config");

const channelSchema = require("./channels");
const itemSchema = require("./items");

module.exports = (() => {
	let instance;
	let db = mongoose.connection;
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
