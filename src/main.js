import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-time-slider";
import "@arcgis/core/assets/esri/themes/dark/main.css";
import "@esri/calcite-components/components/calcite-button";
import "@arcgis/map-components/components/arcgis-expand";

// Imports
import { animationConfig } from "/src/animationConfig.js";
import { slideAnimation } from "/src/slideAnimator.js";

let mapView = null;
let isEmbedded = false; // Flag to indicate if the map is viewed in an embedded context
let hashIndex = 0;

// Define the map components
const mapElement =
  document.querySelector("arcgis-map") ||
  document.querySelector("arcgis-scene");


const resetButton = document.querySelector("#reset-button");

if (!mapElement) {
  console.error("No <arcgis-map> or <arcgis-scene> element found.");
}
mapElement.setAttribute("item-id", animationConfig.mapId);
mapElement.setAttribute("play-rate", animationConfig.timePlayRate);
const timeSlider = document.querySelector("arcgis-time-slider");

// Base URL for runtime assets (respects Vite `base` config and GitHub Pages path)
const BASE = import.meta.env.BASE_URL || '/';

// Set DEBUG to true to enable debug logging
const DEBUG = animationConfig.debugMode;
function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

/**
 * Load choreography data from the specified JSON file path,
 * parses it, and stores the result in choreographyData.
 */
let choreographyData = [];
async function loadChoreography(path) {
  try {
    const response = await fetch(path);
    choreographyData = await response.json();
    log("Loaded data", choreographyData);
  } catch (error) {
    console.error("Failed to load choreography:", error);
  }
}

/**
 * Listen for changes in the URL hash and triggers slide animation
 * based on the corresponding index in choreographyData.
 */
function setupHashListener() {
  window.addEventListener("hashchange", function () {
    log("Hash changed to: " + window.location.hash);
    hashIndex = parseInt(window.location.hash.substring(1), 10);

    if (isNaN(hashIndex) || !choreographyData[hashIndex]) {
      log("No valid hash index found.");
      return;
    }

    const currentSlide = choreographyData[hashIndex];
    slideAnimation(currentSlide, mapView, timeSlider, isEmbedded);
  });
}

function setupResetButton() {
  // Add reset animation button
  resetButton.addEventListener("click", () => {
    const config = choreographyData[hashIndex];
    if (config) {
      // Reset the time slider to its initial state
      timeSlider.timeExtent = {
        start: null,
        end: new Date(config.timeSliderStart)
      };

      // Replay the animation
      if (timeSlider.state === "ready") {
        timeSlider.play();
      }

      log("Animation reset and replayed.");
    } else {
      console.error("No configuration found for the current hash.");
    }
  });
}

/**
 * Initialize the timeSlider using configuration from the first slide in choreographyData.
 * Sets the full time extent, interval stops, and starting frame.
 * Automatically starts playback if the slider is ready and not in embedded mode.
 */
function configureTimeSlider() {
  const slideData = choreographyData[0];
  if (timeSlider && slideData.timeSlider && slideData.timeSlider.timeSliderStart && slideData.timeSlider.timeSliderEnd) {
    const timeStart = slideData.timeSlider.timeSliderStart;
    const timeEnd = slideData.timeSlider.timeSliderEnd;
    const timeUnit = slideData.timeSlider.timeSliderUnit;
    const timeStep = slideData.timeSlider.timeSliderStep;
    const startFrame = new Date(timeStart);
    const endFrame = new Date(timeEnd);

    // Configure time extent
    log("Configuring time slider:", { start: startFrame, end: endFrame, timeUnit: timeUnit, timeStep: timeStep });
    timeSlider.fullTimeExtent = { start: startFrame, end: endFrame };
    timeSlider.timeExtent = { start: null, end: startFrame };

    // Set the time slider interval based on choreography
    timeSlider.stops = {
      interval: {
        value: timeStep,
        unit: timeUnit,
      },
    };

    // Start the time slider if not already playing and if outside script embed story
    if (timeSlider.state === "ready" && !isEmbedded) {
      timeSlider.play();
    }
  } else if (!timeSlider) {
    log("No timeSlider component found.");
  } else {
    log("No timeSlider configuration found in choreography.");
  }
}

/**
 * Initialize the map animation system by loading choreography data,
 * setting up message listeners, and configuring the time slider.
 */
async function initMapAnimator(choreographyPath) {
  await loadChoreography(choreographyPath);
  setupHashListener()
  configureTimeSlider();
  setupResetButton();
}


// Enable or disable the reset button based on the autoplay argument
function updateResetButtonState() {
  const config = choreographyData[hashIndex];
  if (config && config.timeSliderAutoplay) {
    resetButton.disabled = false; // Enable the button
    timeSlider.stop();
  } else {
    resetButton.disabled = true; // Disable the button
  }
}




/**
 * Wait for the ArcGIS map view to become ready, then initializes the map animator
 * using the choreography configuration path.
 */
mapElement.addEventListener("arcgisViewReadyChange", async (event) => {
  if (!event.target.ready) return;
  mapView = mapElement.view;
  // Disable map navigation
  if (animationConfig.disableMapNav) {
    mapView.on("mouse-wheel", (event) => {
      event.stopPropagation();
    });
    mapView.on("drag", (event) => {
      event.stopPropagation();
    });
  }
  // ensure choreography path is resolved relative to BASE (strip leading slash)
  const choreographyPath = (animationConfig.choreographyPath || '').replace(/^\//, '');
  initMapAnimator(BASE + choreographyPath);
});
