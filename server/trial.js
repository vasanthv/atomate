var { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");

JSDOM.fromURL("https://paper.mmm.dev/", {}).then((dom) => {
	let reader = new Readability(dom.window.document);
	let article = reader.parse();
	console.log(article);
});
