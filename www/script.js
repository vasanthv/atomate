/* global page, axios, Vue, cabin */

const urlParams = new URLSearchParams(window.location.search);

const defaultState = function () {
	return {
		loading: true,
		page: "",
		toast: [{ type: "", message: "" }],
		items: [],
		inputURL: "",
		channels: [],
	};
};

let atomateDb = indexedDB.open("MyDatabase", 1);

const App = Vue.createApp({
	data() {
		return defaultState();
	},
	computed: {},
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
		userEvent(event) {
			if (cabin) cabin.event(event);
		},
		createChannel() {
			axios.post("/api/channels", { input: this.inputURL }).then((response) => {
				addChannel(response.data.channel);
				page.redirect("/channels");
			});
			this.userEvent("createChannel");
		},
		removeChannel(channelId) {
			removeChannel(channelId);
		},
		getItems() {
			const channels = this.channels.map((c) => c.link);
			axios.get("/api/items", { channels }).then((response) => {
				console.log(response);
			});
		},
	},
}).mount("#app");

(() => {
	axios.interceptors.request.use((config) => {
		window.cancelRequestController = new AbortController();
		return { ...config, signal: window.cancelRequestController.signal };
	});
})();

// Routes setup
// Routes middleware
page("*", (ctx, next) => {
	// resetting state on any page load
	App.resetState();
	if (window.cancelRequestController) {
		window.cancelRequestController.abort();
	}
	next();
});
// Routes declaration
page("/", () => {
	App.page = App.channels.length > 0 ? "feed" : "intro";
	if (App.page === "feed") {
		App.getItems();
	}
});

page("/channels", () => (App.page = "channels"));
page("/channels/add", () => (App.page = "addChannel"));
page("/read", () => (App.page = "read"));
page("/*", () => (App.page = "404"));

// IndexedDb actions
// Create the schema
atomateDb.onupgradeneeded = function () {
	const dbResult = atomateDb.result;
	dbResult.createObjectStore("channels", { keyPath: "_id" });
};

const getAllChannels = () => {
	const dbResult = atomateDb.result;
	const tx = dbResult.transaction("channels", "readwrite");
	const store = tx.objectStore("channels");

	const _getAllChannels = store.getAll();

	_getAllChannels.onsuccess = () => {
		App.channels = _getAllChannels.result;
	};
};

const addChannel = (channel) => {
	const dbResult = atomateDb.result;
	const tx = dbResult.transaction("channels", "readwrite");
	const store = tx.objectStore("channels");

	const putAction = store.put(channel);
	putAction.onsuccess = () => {
		// refresh the channels array
		getAllChannels();
	};
	putAction.onerror = (e) => console.error(e);
};

const removeChannel = (channelId) => {
	const dbResult = atomateDb.result;
	const tx = dbResult.transaction("channels", "readwrite");
	const store = tx.objectStore("channels");

	const deleteAction = store.delete(channelId);
	deleteAction.onsuccess = () => {
		// refresh the channels array
		getAllChannels();
	};
	deleteAction.onerror = (e) => console.error(e);
};
atomateDb.onsuccess = () => {
	getAllChannels();
};

const initApp = () => {
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/sw.js");
	}
	page();
};

initApp();
