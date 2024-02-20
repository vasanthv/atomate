const router = require("express").Router();
const model = require("./model");

router.post("/channels", model.createChannel);
router.get("/items", model.getItems);
router.get("/sources", model.getSources);
router.put("/push", model.updatePushCredentials);
router.put("/push/subscribe", model.pushSubscribeChannel);
router.put("/push/unsubscribe", model.pushUnsubscribeChannel);
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
