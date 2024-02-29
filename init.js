const bodyParser = require("body-parser");
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const app = express();

const config = require("./config");
const { initAllChannelsFetch: initScheduler } = require("./src/scheduler");
const routes = require("./src/routes");

app.set("view engine", "ejs");

// Serve vue.js & axios to the browser
app.use(express.static(path.join(__dirname, "node_modules/axios/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/vue/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/page/")));

// Serve frontend assets & images to the browser
app.use(express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "www"), { maxAge: 0 }));

// Handle API requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev")); // for dev logging

app.use("/api", routes);

app.use(["/", "/items", "/channels", "/channels/*"], (req, res) =>
	res.sendFile(path.join(__dirname, "www/index.html"))
);

// Start the server
app.listen(config.PORT, null, function () {
	console.log("Node version", process.version);
	console.log("Currl server running on port", config.PORT);
});

// Initialize the scheduler for every channel to fetch on a frequent interval
initScheduler();
