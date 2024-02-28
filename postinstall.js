const fs = require("fs");
const path = require("path");
if (process.env.NODE_ENV === "production" && process.env.ANALYTICS_SCRIPT) {
	console.log("Inserting Analytics script tag");

	const scriptTag = `<script async defer src="${process.env.ANALYTICS_SCRIPT}"></script>`;

	const filesToAttachAnalytics = ["www/index.html", "www/terms.html", "www/privacy.html"];

	filesToAttachAnalytics.forEach((file) => {
		const fileContents = fs.readFileSync(path.join(__dirname, file)).toString();
		const newFileContents = fileContents.replace("<!-- ANALYTICS_SCRIPT -->", scriptTag);
		fs.writeFileSync(path.join(__dirname, file), newFileContents);
	});
}
