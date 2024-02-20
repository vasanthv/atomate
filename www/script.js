/* global linkifyHtml, page, axios, Vue, cabin */

let swReg = null;
const urlB64ToUint8Array = (base64String) => {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

const initApp = async () => {
	if ("serviceWorker" in navigator) {
		swReg = await navigator.serviceWorker.register("/sw.js");

		navigator.serviceWorker.addEventListener("message", (event) => {
			if (!event.data.action) return;
			switch (event.data.action) {
				default:
					break;
			}
		});
	}
};

const urlParams = new URLSearchParams(window.location.search);

const defaultState = function () {
	return {
		loading: true,
		page: "",
		deviceId: window.localStorage.deviceId,
		toast: [{ type: "", message: "" }],
		sources: [],
		items: [],
		sourceInput: "",
		channel: window.localStorage.channels ? JSON.parse(window.localStorage.channels) : [],
	};
};

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
			axios.post("/api/channels", { source, input }).then((response) => {
				console.log(response);
			});
			this.userEvent("createChannel");
		},
		getSources() {
			axios.get("/api/sources").then((response) => {
				console.log(response);
			});
		},
		getItems() {
			const channels = this.channels.map((c) => c.link);
			axios.get("/api/items", { channels }).then((response) => {
				console.log(response);
			});
		},
		pushSubscribe(channel) {
			axios.put("/api/push/subscribe", { deviceId, link: channel.link }).then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		pushUnsubscribe(channel) {
			axios.put("/api/push/unsubscribe", { deviceId, link: channel.link }).then((response) => {
				this.setToast(response.data.message, "success");
			});
		},
		async subscribeToPush() {
			if (swReg) {
				try {
					const vapidKey = (await axios.get("/api/meta")).data.vapidKey;
					if (vapidKey) {
						const pushSubscription = await swReg.pushManager.subscribe({
							userVisibleOnly: true,
							applicationServerKey: urlB64ToUint8Array(vapidKey),
						});
						const credentials = JSON.parse(JSON.stringify(pushSubscription));
						await axios.put("/api/push", { credentials });
						window.localStorage.pushSubscribed = true;
						this.pushSubscribed = true;
					}
					return true;
				} catch (err) {
					console.log(err);
					if (this.page === "home") {
						this.setToast("Unable to enable notification, please try again.", "error");
					}
					return false;
				}
			}
		},
		logError(message, source, lineno, colno) {
			const error = { message, source, lineno, colno, handle: this.handle, page: this.page };
			axios.post("/api/error", { error }).then(() => {});
			return true;
		},
	},
}).mount("#app");

window.onerror = App.logError;

(() => {
	axios.interceptors.request.use((config) => {
		window.cancelRequestController = new AbortController();
		return { ...config, signal: window.cancelRequestController.signal };
	});

	initApp();
})();

page("*", (ctx, next) => {
	// resetting state on any page load
	App.resetState();
	if (window.cancelRequestController) {
		window.cancelRequestController.abort();
	}
	next();
});

/* Routes declaration */
page("/", () => {
	App.page = App.channels.length > 0 ? "home" : "intro";
	if (App.page === "home") {
		App.getItems();
	}
});

page("/channels", () => {
	App.page = "channels";
});

page("/addsource", () => {
	App.page = "addsource";
});

page("/source/:sourceId", () => {
	App.page = "source";
});

page("/read", () => {
	App.page = "read";
});

page("/*", () => {
	App.page = "404";
});

page();
