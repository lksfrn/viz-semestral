const path = require("path");
const fs = require("fs");
const _ = require("lodash");

function convertFilenameToData(filename) {
  const filePath = path.join("data", filename);

  // load the file
  const file = fs.readFileSync(filePath, "utf8");

  const lines = CSVToArray(file, ",").map((line) => {
    return line.map((s) =>
      // convert to number if possible
      s !== "" && !Number.isNaN(Number(s)) ? Number(s) : _.trim(s, '"')
    );
  });

  // skip first header line and last blank line
  return lines.slice(1, -1);
}

function CSVToArray(strData, strDelimiter) {
  strDelimiter = strDelimiter || ",";

  const objPattern = new RegExp(
    // delimiters
    "(\\" +
      strDelimiter +
      "|\\r?\\n|\\r|^)" +
      // quoted fields
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // standard fields
      '([^"\\' +
      strDelimiter +
      "\\r\\n]*))",
    "gi"
  );

  const arrData = [[]];
  let arrMatches = null;

  while ((arrMatches = objPattern.exec(strData))) {
    const strMatchedDelimiter = arrMatches[1];

    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      arrData.push([]);
    }

    let strMatchedValue;

    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      strMatchedValue = arrMatches[3];
    }

    arrData[arrData.length - 1].push(strMatchedValue);
  }

  return arrData;
}

const stops = convertFilenameToData("stops.txt");
const routes = convertFilenameToData("routes.txt");
const trips = convertFilenameToData("trips.txt");
const stopTimes = convertFilenameToData("stop_times.txt");

const stopIdToParentId = {};
const stopIdToStop = {};
stops.forEach((stop) => {
  // parent ID is used as a key for the stop ID
  const parent = stop[5] || stop[0];
  stopIdToParentId[stop[0]] = parent;

  // get stop by its ID
  stopIdToStop[parent] = {
    id: parent,
    name: stop[1],
    lat: stop[2],
    lon: stop[3],
    value: 0,
    edges: new Set(),
    wheelchair: Math.min(
      { 0: 0, 2: 1, 1: 2 }[stop[6]], // reorder wheelchair accessibility
      stopIdToStop[parent]?.wheelchair || 2
    ),
  };
});

// get route by its spoken name
const routeIdToRouteName = {};
routes.forEach((route) => {
  routeIdToRouteName[route[0]] = route[2];
});

// get trip by its route spoken name
const tripIdToRouteName = {};
trips.forEach((trip) => {
  if (trip[2]) {
    tripIdToRouteName[trip[2]] = routeIdToRouteName[trip[0]];
  }
});

const stations = new Set();
const neighbors = {};
let prevStopId = null;
let prevTripId = null;
let prevSequence = null;
stopTimes.forEach((stopTime) => {
  const tripId = stopTime[0];
  const stopId = stopIdToParentId[stopTime[3]];
  const sequence = stopTime[4];

  // filter trams and subways
  const routeName = tripIdToRouteName[tripId];
  if (
    !(Number.isSafeInteger(routeName) && routeName < 100) && // trams
    !["A", "B", "C"].includes(routeName) // subways
  ) {
    return;
  }

  stations.add(stopId);
  stopIdToStop[stopId].edges.add(routeName);

  // append marks to subway's names
  if (
    ["A", "B", "C"].includes(routeName) &&
    !stopIdToStop[stopId].name.endsWith("(M)")
  ) {
    stopIdToStop[stopId].name += " (M)";
  }

  // add edge between stops
  // conditional is true when new sequence is processed
  if (
    prevStopId &&
    prevSequence &&
    sequence > prevSequence &&
    prevTripId === tripId
  ) {
    const edge = [prevStopId, stopId];
    edge.sort();

    neighbors[edge.join("-")] = neighbors[edge.join("-")] + 1 || 1;
  }

  prevStopId = stopId;
  prevSequence = sequence;
  prevTripId = tripId;
});

// prepare default ranges
const edgeValueRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
const nodeValueRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
const latRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
const lonRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

let edges = Object.entries(neighbors).map(([key, value]) => {
  const [sourceName, targetName] = key.split("-");
  const source = stopIdToStop[sourceName];
  const target = stopIdToStop[targetName];

  target.value += value;
  source.value += value;

  // target value range
  if (target.value > nodeValueRange[1]) {
    nodeValueRange[1] = target.value;
  }

  if (target.value < nodeValueRange[0]) {
    nodeValueRange[0] = target.value;
  }

  // source value range
  if (source.value > nodeValueRange[1]) {
    nodeValueRange[1] = source.value;
  }

  if (source.value < nodeValueRange[0]) {
    nodeValueRange[0] = source.value;
  }

  // edge value range
  if (value > edgeValueRange[1]) {
    edgeValueRange[1] = value;
  }

  if (value < edgeValueRange[0]) {
    edgeValueRange[0] = value;
  }

  // target latitude range
  if (target.lat > latRange[1]) {
    latRange[1] = target.lat;
  }

  if (target.lat < latRange[0]) {
    latRange[0] = target.lat;
  }

  // target longitude range
  if (target.lon > lonRange[1]) {
    lonRange[1] = target.lon;
  }

  if (target.lon < lonRange[0]) {
    lonRange[0] = target.lon;
  }

  // source latitude range
  if (source.lat > latRange[1]) {
    latRange[1] = source.lat;
  }

  if (source.lat < latRange[0]) {
    latRange[0] = source.lat;
  }

  // source longitude range
  if (source.lon > lonRange[1]) {
    lonRange[1] = source.lon;
  }

  if (source.lon < lonRange[0]) {
    lonRange[0] = source.lon;
  }

  return {
    source: sourceName,
    target: targetName,
    value,
  };
});

// descending sort by value
edges = _.reverse(_.sortBy(edges, "value"));

// scale edge value to [0, 1]
edges = edges.map((edge) => {
  edge.value =
    (edge.value - edgeValueRange[0]) / (edgeValueRange[1] - edgeValueRange[0]);
  return edge;
});

// convert edges set to sorted array
// scale node value to [0, 1]
let nodes = Array.from(stations).map((station) => {
  stopIdToStop[station].edges = Array.from(stopIdToStop[station].edges).sort();
  stopIdToStop[station].value =
    (stopIdToStop[station].value - nodeValueRange[0]) /
    (nodeValueRange[1] - nodeValueRange[0]);
  return stopIdToStop[station];
});

// descending sort by value
nodes = _.reverse(_.sortBy(nodes, "value"));

fs.writeFileSync(
  path.join("data", "miserables.json"),
  JSON.stringify({ nodes, edges, latRange, lonRange })
);
