const bodyParser = require("body-parser");
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const app = express();

const config = require("./config");
const routes = require("./routes");

app.set("trust proxy", true);
app.set("view engine", "ejs");

// Serve vue.js & axios to the browser
app.use(express.static(path.join(__dirname, "node_modules/vue/dist/")));
app.use(express.static(path.join(__dirname, "node_modules/axios/dist/")));

// Serve frontend assets & images to the browser
app.use(express.static(path.join(__dirname, "icons")));
app.use(express.static(path.join(__dirname, "www"), { maxAge: 0 }));

// Handle API requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan("dev")); // for dev logging

app.use(routes);

// Start the server
app.listen(config.PORT, null, function () {
	console.log("Node version", process.version);
	console.log("Currl server running on port", config.PORT);
});
