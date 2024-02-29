const rateLimiter = require("express-rate-limit");
const router = require("express").Router();
const model = require("./model");

const limiter = rateLimiter({
	limit: 10,
	windowMs: 60 * 60 * 1000, // One hour
	skipFailedRequests: true,
	handler: (req, res, next, options) =>
		res.status(options.statusCode).json({ message: `Too many requests. Try again after 60 minutes` }),
});

router.post("/channels", limiter, model.createChannel);
router.get("/channels/:channelId", model.getChannel);
router.get("/items", model.getItems);
router.get("/items/:itemId", model.getItem);

/**
 * API endpoints common error handling middleware
 */
router.use(["/:404", "/"], (req, res) => {
	res.status(404).json({ message: "ROUTE_NOT_FOUND" });
});

// Handle the known errors
router.use((err, req, res, next) => {
	if (err.httpErrorCode) {
		res.status(err.httpErrorCode).json({ message: err.message || "Something went wrong" });
	} else {
		next(err);
	}
});

// Handle the unknown errors
router.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: "Something went wrong" });
});

module.exports = router;
