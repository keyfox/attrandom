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

function randomIntExcept(max, except) {
  let picked = null;
  do {
    picked = Math.floor(Math.random() * max);
  } while (picked === except && max >= 2);
  return picked;
}

function hasTextExt(filename) {
  return true;
}

let dragEventTarget = null;
const FILES_COUNT_WARN_THRESHOLD = 10;

const AttrandomApp = {
  data() {
    return {
      // dropped text files
      sources: null,
      // picked lines
      pickedLines: null,
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
      const textFileEntries = entries.filter((e) => hasTextExt(e.name));
      if (
        textFileEntries.length < FILES_COUNT_WARN_THRESHOLD ||
        confirm(
          textFileEntries.length + " files are about to be loaded. Continue?"
        )
      ) {
        this.sources = (
          await Promise.all(textFileEntries.map(readTextFile))
        ).map((lines, i) => ({
          name: textFileEntries[i].name,
          path: textFileEntries[i].name,
          lines,
        }));
        this.pickedLines = null;
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
    roll(target) {
      this.pickedLines = this.sources.map((e, i) => {
        if (typeof target !== "undefined" && target !== i) {
          // preserve current one as this is not a target
          return this.pickedLines[i];
        }
        const entireLen = e.lines.length;
        const lineIndex = randomIntExcept(
          entireLen,
          this.pickedLines && this.pickedLines[i].lineIndex
        );
        return {
          source: e,
          lineIndex,
          content: e.lines[lineIndex],
        };
      });
    },
  },
  computed: {
    filesCount() {
      return this.itemsDropped ? this.sources.length : 0;
    },
    itemsDropped() {
      return this.sources !== null;
    },
  },
};

Vue.createApp(AttrandomApp).mount("#root");
