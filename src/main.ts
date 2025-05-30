import FlipClock from "flipclock";
import { getBingPaperData } from "@/api";
import "@/style/index.less";
import { AsyncFuncRetry } from "./utils/request";

const configs = {
  position_x: 50,
  position_y: 40,
  scale: 1,
  mode: "image",
  image: "",
  video: "",
  url: "",
};

let isCustomWallpaper = false;

let timer: number | null = null;

const clock = new FlipClock(document.querySelector(".clock"), {
  face: "TwentyFourHourClock",
});

// 每隔一分钟重置，以防止时钟不准
setInterval(() => {
  clock.reset();
}, 1000 * 60);

startInterval();

const positions = ["position_x", "position_y", "scale"] as const;
const backgrounds = ["image", "video", "mode"] as const;
const papers = ["image", "video"] as const;

window.wallpaperPropertyListener = {
  applyUserProperties: function (properties) {
    for (const prop of positions) {
      if (properties[prop]) {
        configs[prop] = properties[prop].value;
      }
    }
    for (const prop of backgrounds) {
      if (properties[prop]) {
        configs[prop] = properties[prop].value;
        if (configs[prop] && papers.find((v) => v === prop)) {
          configs[prop] = "file:///" + configs[prop];
        }
      }
    }
    if (positions.some((prop) => properties[prop])) {
      updatePosition();
    }
    if (backgrounds.some((prop) => properties[prop])) {
      updateWallpaper();
    }
  },
};

function queryImageData() {
  if (isCustomWallpaper) {
    stopInterval();
    return;
  }
  const t = timer;
  AsyncFuncRetry(getBingPaperData, [], {
    delay: 10 * 1000,
    retries: 30,
    stop: () => {
      return isCustomWallpaper || t !== timer;
    },
  })
    .then((images) => {
      const image = images[0];
      const url = `https://cn.bing.com${image.url}`;
      if (isCustomWallpaper) {
        stopInterval();
        return;
      }
      configs.url = url;
      const bg = document.querySelector(".bg") as HTMLElement;
      bg.innerHTML = `<img class="paper" src="${configs.url}" />`;
    })
    .catch(() => {
      if (isCustomWallpaper) {
        stopInterval();
      }
    });
}

function updatePosition() {
  const clock = document.querySelector(".clock") as HTMLElement;
  clock.style.left = `${configs.position_x}%`;
  clock.style.top = `${configs.position_y}%`;
  clock.style.scale = `${configs.scale}`;
  clock.style.transformOrigin = `left top`;
}

function updateWallpaper() {
  const bg = document.querySelector(".bg") as HTMLElement;
  if (configs.mode === "image" && configs.image) {
    isCustomWallpaper = true;
    stopInterval();
    bg.innerHTML = `<img class="paper" src="${configs.image}" />`;
  } else if (configs.mode === "video" && configs.video) {
    isCustomWallpaper = true;
    stopInterval();
    bg.innerHTML = `<video class="paper" autoplay loop muted playsinline src="${configs.video}"></video>`;
  } else {
    isCustomWallpaper = false;
    startInterval();
  }
}

function startInterval() {
  if (timer) {
    window.clearInterval(timer);
  }
  timer = window.setInterval(() => {
    queryImageData();
  }, 10 * 60 * 1000);
  queryImageData();
}

function stopInterval() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}
