var { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");

JSDOM.fromURL("https://news.ycombinator.com/item?id=39293050", {}).then((dom) => {
	let reader = new Readability(dom.window.document);
	let article = reader.parse();
	console.log(article);
});
