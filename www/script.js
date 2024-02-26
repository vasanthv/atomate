/* global page, axios, Vue, cabin */

const defaultState = function () {
	return {
		loading: true,
		page: "",
		toast: [{ type: "", message: "" }],
		showSearchField: false,
		searchQuery: "",
		items: [],
		showLoadMore: false,
		disableChannelInput: false,
		inputURL: "",
		channels: [],
		channel: {},
		item: {},
	};
};

let atomateDb = indexedDB.open("atomateIndexedDb", 1);

const App = Vue.createApp({
	data() {
		return defaultState();
	},
	computed: {
		pageTitle() {
			switch (this.page) {
				case "home":
					return "Your feed";
				case "channels":
					return "Your channels";
				case "addChannel":
					return "Add new channel";
				case "channel":
					return this.channel.title;
				case "item":
					return this.item.title;
				default:
					return "";
			}
		},
		pageDescription() {
			switch (this.page) {
				case "channel":
					return this.channel.description;
				default:
					return "";
			}
		},
		showSearch() {
			return ["home", "channels", "channel"].includes(this.page);
		},
		showItemFeed() {
			return ["home", "channel"].includes(this.page);
		},
	},
	methods: {
		resetState() {
			const newState = defaultState();
			Object.keys(newState).map((key) => (this[key] = newState[key]));
		},
		setToast(message, type = "error") {
			this.toast = { type, message, time: new Date().getTime() };
			setTimeout(() => {
				if (new Date().getTime() - this.toast.time >= 3000) {
					this.toast.message = "";
				}
			}, 3500);
		},
		formatDate(datestring) {
			const seconds = Math.floor((new Date() - new Date(datestring)) / 1000);
			let interval = seconds / 31536000;
			if (interval > 1) return Math.floor(interval) + "Y";
			interval = seconds / 2592000;
			if (interval > 1) return Math.floor(interval) + "M";
			interval = seconds / 86400;
			if (interval > 1) return Math.floor(interval) + "d";
			interval = seconds / 3600;
			if (interval > 1) return Math.floor(interval) + "h";
			interval = seconds / 60;
			if (interval > 1) return Math.floor(interval) + "m";
			return "now";
		},
		toggleSearchField() {
			this.searchQuery = "";
			this.showSearchField = !this.showSearchField;
			if (this.showSearchField) {
				setTimeout(() => document.getElementById("searchField").focus(), 0);
			}
		},
		userEvent(event) {
			if (cabin) cabin.event(event);
		},
		createChannel() {
			this.disableChannelInput = true;
			axios
				.post("/api/channels", { input: this.inputURL })
				.then((response) => {
					addChannel(response.data.channel);
					page.redirect("/channels");
				})
				.finally(() => {
					this.disableChannelInput = false;
				});
			this.userEvent("createChannel");
		},
		removeChannel(channelId) {
			if (confirm("Are you sure you want to remove this Channel?")) {
				removeChannel(channelId);
			}
		},
		getChannel(channelId) {
			const params = {};
			params["skip"] = this.items.length;
			if (this.searchQuery) params["query"] = this.searchQuery;

			axios.get(`/api/channels/${channelId}`, { params }).then((response) => {
				this.channel = response.data.channel;
				this.setItems(response.data.items);
			});
		},
		getItems() {
			const channels = this.channels.map((c) => c._id).join(",");
			const params = { channels };
			params["skip"] = this.items.length;
			if (this.searchQuery) params["query"] = this.searchQuery;
			axios.get("/api/items", { params }).then((response) => {
				this.setItems(response.data.items);
			});
		},
		getItem(itemId) {
			axios.get(`/api/items/${itemId}`).then((response) => {
				this.item = response.data.item;
			});
		},
		setItems(items) {
			if (items.length > 0) {
				items.forEach((m) => this.items.push(m));
			}
			this.showLoadMore = items.length == 50;
		},
		searchItems() {
			if (this.searchQuery) {
				this.items = [];
				if (this.page === "home") this.getItems();
				else if (this.page === "channel") this.getChannel(this.channel._id);
			}
		},
	},
}).mount("#app");

const initApp = () => {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/sw.js");
	}

	axios.interceptors.request.use((config) => {
		window.cancelRequestController = new AbortController();
		return { ...config, signal: window.cancelRequestController.signal };
	});

	axios.interceptors.response.use(
		(response) => response,
		(error) => {
			console.log(error);
			App.setToast(error.response.data.message || "Something went wrong. Please try again");
			throw error;
		}
	);
	page();
};

// Routes setup
// Routes middleware
page("*", (ctx, next) => {
	// resetting state on any page load
	App.items = [];
	App.showLoadMore = false;
	App.searchQuery = "";
	App.showLoadMore = false;
	if (App.page !== "channel") App.channel = {};
	if (App.page !== "item") App.item = {};

	if (window.cancelRequestController) {
		window.cancelRequestController.abort();
	}
	next();
});
// Routes declaration
page("/", () => {
	App.page = App.channels.length > 0 ? "home" : "intro";
	if (App.page === "home") App.getItems();
});

page("/channels", () => (App.page = "channels"));
page("/channels/add", () => (App.page = "addChannel"));
page("/channels/:channelId", (r) => {
	App.page = "channel";
	App.getChannel(r.params.channelId);
});
page("/items/:itemId", (r) => {
	App.page = "item";
	if (!App.item._id) App.getItem(r.params.itemId);
});
page("/*", () => (App.page = "404"));

// IndexedDb actions
// Create the schema
atomateDb.onupgradeneeded = function () {
	const dbResult = atomateDb.result;
	dbResult.createObjectStore("channels", { keyPath: "_id" });
};
atomateDb.onsuccess = async () => {
	await getAllChannels();
	initApp();
};

const getAllChannels = () => {
	return new Promise((resolve, reject) => {
		const dbResult = atomateDb.result;
		const tx = dbResult.transaction("channels", "readwrite");
		const store = tx.objectStore("channels");

		const _getAllChannels = store.getAll();
		_getAllChannels.onerror = (e) => reject(e);
		_getAllChannels.onsuccess = () => {
			App.channels = _getAllChannels.result;
			resolve(_getAllChannels.result);
		};
	});
};

const addChannel = (channel) => {
	return new Promise((resolve, reject) => {
		const dbResult = atomateDb.result;
		const tx = dbResult.transaction("channels", "readwrite");
		const store = tx.objectStore("channels");

		const putAction = store.put(channel);
		putAction.onsuccess = (e) => {
			// refresh the channels array
			getAllChannels();
			resolve(e);
		};
		putAction.onerror = (e) => reject(e);
	});
};

const removeChannel = (channelId) => {
	return new Promise((resolve, reject) => {
		const dbResult = atomateDb.result;
		const tx = dbResult.transaction("channels", "readwrite");
		const store = tx.objectStore("channels");

		const deleteAction = store.delete(channelId);
		deleteAction.onsuccess = (e) => {
			// refresh the channels array
			getAllChannels();
			resolve(e);
		};
		deleteAction.onerror = (e) => reject(e);
	});
};
