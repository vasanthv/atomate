/**
 * This file is taken from https://github.com/nasa8x/rss-to-json/blob/master/src/parse.ts
 * with some modifications as it will evolve in the future and we need control over this parser
 * to iterate faster.
 */

const rssParser = (data, feedURL) => {
	let channel = data.rss?.channel ? data.rss.channel : data.feed;
	if (Array.isArray(channel)) channel = channel[0];

	let link = channel.link && channel.link.href ? channel.link.href : channel.link;
	if (Array.isArray(link)) link = link[0].href ? link[0].href : link[0];

	let items = channel.item || channel.entry || [];
	if (items && !Array.isArray(items)) items = [items];

	const rss = {
		title: channel.title ?? "",
		description: channel.description ?? "",
		link,
		feedURL,
		image: channel.image ? channel.image.url : channel["itunes:image"] ? channel["itunes:image"].href : "",
		items,
	};

	rss.items = rss.items.map((item) => {
		let obj = {};
		const media = {};

		obj = {
			id: item.guid && item.guid.$text ? item.guid.$text : item.id,
			title: item.title && item.title.$text ? item.title.$text : item.title,
			description: item.summary && item.summary.$text ? item.summary.$text : item.description,
			link: item.link && item.link.href ? item.link.href : item.link,
			author: item.author && item.author.name ? item.author.name : item["dc:creator"],
			published: item.created
				? new Date(item.created)
				: item.pubDate
				? new Date(item.pubDate)
				: item.published
				? new Date(item.published)
				: undefined,
			updated: item.updated ? new Date(item.updated) : undefined,
			content: item.content && item.content.$text ? item.content.$text : item["content:encoded"],
			enclosures: item.enclosure ? (Array.isArray(item.enclosure) ? item.enclosure : [item.enclosure]) : [],
		};

		if (item["media:thumbnail"]) {
			Object.assign(media, { thumbnail: item["media:thumbnail"] });
			obj.enclosures.push(item["media:thumbnail"]);
		}

		if (item["media:content"]) {
			Object.assign(media, { thumbnail: item["media:content"] });
			obj.enclosures.push(item["media:content"]);
		}

		if (item["media:group"]) {
			if (item["media:group"]["media:title"]) obj.title = item["media:group"]["media:title"];

			if (item["media:group"]["media:description"]) obj.description = item["media:group"]["media:description"];

			if (item["media:group"]["media:thumbnail"]) obj.enclosures.push(item["media:group"]["media:thumbnail"].url);

			if (item["media:group"]["media:content"]) obj.enclosures.push(item["media:group"]["media:content"]);
		}

		Object.assign(obj, { media });

		return obj;
	});

	return rss;
};

module.exports = { rssParser };
