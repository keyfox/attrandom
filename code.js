async function scanFiles(entry, out) {
  if (entry.isDirectory) {
    const entryReader = entry.createReader();
    const entries = await new Promise((resolve) => {
      entryReader.readEntries((entries) => resolve(entries));
    });
    await Promise.all(entries.map((entry) => scanFiles(entry, out)));
  } else if (entry.isFile) {
    out.push(entry);
  }
}

async function readTextFile(entry) {
  return new Promise((resolve) => {
    entry.file((f) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const lines = reader.result.split("\n");
        return resolve(lines);
      });
      reader.readAsText(f);
    });
  });
}

function hasTextExt(filename) {
  return true;
  // return filename.split(".").pop().toLowerCase() === "txt";
}

let dragEventTarget = null;
let lastPickedIndex = -1;
const HISTORY_MAX_LENGTH = 32;
const IMAGE_CACHE_MAX_LENGTH = HISTORY_MAX_LENGTH + 1;
let imagesCreated = 0;
const DEBOUNCE_DELAY = 125;
let loadTimeTimer;

const AttrandomApp = {
  data() {
    return {
      // dropped text files
      textFileEntries: null,
      // a content of picked line
      pickedText: null,
      // index of picked line
      pickedLineIndex: null,
      // candidates
      lines: null,
      // indicates whether files or directories are being dragged.
      dragHovering: false,
      // indicates whether the app is searching for image files.
      loadingDroppedItem: false,
    };
  },
  mounted() {
    window.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      dragEventTarget = ev.target;
      this.dragHovering = true;
    });
    window.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "link";
    });
    window.addEventListener("drop", async (ev) => {
      // chores
      ev.preventDefault();
      this.dragHovering = false;
      this.loadingDroppedItem = true;
      // process dropped items
      const droppedItems = ev.dataTransfer.items;
      const entries = [];
      const promises = [];
      for (const d of droppedItems) {
        const entry = d.webkitGetAsEntry();
        promises.push(scanFiles(entry, entries));
      }
      await Promise.all(promises);
      // extract text files
      this.textFileEntries = entries.filter((e) => hasTextExt(e.name));
      if (this.textFileEntries.length === 0) {
        this.lines = null;
      } else {
        // we process just one file for now
        this.lines = await readTextFile(this.textFileEntries[0]);
        // pick a line from the text once loaded
        this.roll();
      }
      this.loadingDroppedItem = false;
    });
    window.addEventListener("dragleave", (ev) => {
      ev.preventDefault();
      if (ev.target === dragEventTarget || ev.target === document) {
        this.dragHovering = false;
      }
    });
  },
  methods: {
    roll() {
      // aliasing
      const lines = this.lines;

      // pick an index taking consecutive selection into account
      const index = (() => {
        let i = null;
        do {
          i = Math.floor(Math.random() * lines.length);
        } while (i === lastPickedIndex && lines.length >= 2);
        return i;
      })();
      lastPickedIndex = index;

      this.pickedLineIndex = index;
      this.pickedText = lines[index];
    },
  },
  computed: {
    candidatesCount() {
      return this.itemsDropped && this.lines ? this.lines.length : 0;
    },
    itemsDropped() {
      return this.textFileEntries !== null;
    },
  },
};

Vue.createApp(AttrandomApp).mount("#root");
