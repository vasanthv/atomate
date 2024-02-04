/**
 * A singleton implemetaion for the database
 */

const mongoose = require("mongoose");
const config = require("./config");

module.exports = (() => {
	let instance;
	let db = mongoose.connection;
	mongoose.set("strictQuery", true);

	const connectToDb = () => {
		mongoose.connect(config.MONGO_URL, {
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
		const Schema = mongoose.Schema;

		console.log("Atomate DB initialized");

		const sourceSchema = new Schema({
			url: { type: String, index: true, required: true, unique: true },
			webpage: String,
			name: String,
			description: String,
			language: String,
			createdOn: Date,
			lastUpdatedOn: Date,
			lastFetchedOn: Date,
		});

		const itemSchema = new Schema({
			guid: { type: String, index: true, required: true, unique: true },
			title: String,
			link: String,
			description: String,
			publishedBy: String,
			publishedOn: Date,
			fetchedOn: Date,
		});

		itemSchema.index({ title: "text", notes: "text" });

		const Sources = mongoose.model("Sources", sourceSchema);
		const Items = mongoose.model("Items", itemSchema);

		// Users.syncIndexes()
		// 	.then(() => Users.ensureIndexes())
		// 	.then(() => Users.collection.getIndexes())
		// 	.then(console.log);

		return { Sources, Items };
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
