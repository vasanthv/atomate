const fs = require("fs");
const path = require("path");

console.log("Node environment is:", process.env.NODE_ENV);

if (process.env.NODE_ENV === "production") {
	const serviceWorkerContents = fs.readFileSync(path.join(__dirname, "../www/sw.js")).toString();
	const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"))).version;

	const newServiceWorkerContents = serviceWorkerContents.replace("~VERSION", VERSION);

	fs.writeFileSync(path.join(__dirname, "../www/sw.js"), newServiceWorkerContents);

	console.log("Service worker file updated to version", VERSION);
}

if (process.env.NODE_ENV === "production" && process.env.ANALYTICS_SCRIPT) {
	console.log("Inserting Analytics script tag");

	const scriptTag = `<script async defer src="${process.env.ANALYTICS_SCRIPT}"></script>`;

	const filesToAttachAnalytics = ["../www/index.html", "../www/terms.html", "../www/privacy.html"];

	filesToAttachAnalytics.forEach((file) => {
		const fileContents = fs.readFileSync(path.join(__dirname, file)).toString();
		const newFileContents = fileContents.replace("<!-- ANALYTICS_SCRIPT -->", scriptTag);
		fs.writeFileSync(path.join(__dirname, file), newFileContents);
	});
	console.log("Analytics script tag inserted");
}
