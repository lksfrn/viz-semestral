const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const { exit } = require("process");
// const csv = require("csv-parse/lib/es5");

function convertFilenameToData(filename) {
  const filePath = path.join("data", filename);

  const file = fs.readFileSync(filePath, "utf8");

  const lines = CSVToArray(file, ",").map((line) => {
    return line.map((s) =>
      s !== "" && !Number.isNaN(Number(s)) ? Number(s) : _.trim(s, '"')
    );
  });

  return lines.slice(1, -1);

  //   return file
  //     .split("\n")
  //     .map((line) =>
  //       line
  //         .split(",")
  //         .map((s) =>
  //           s !== "" && !Number.isNaN(Number(s)) ? Number(s) : _.trim(s, '"')
  //         )
  //     );
}

function CSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = strDelimiter || ",";

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    // Delimiters.
    "(\\" +
      strDelimiter +
      "|\\r?\\n|\\r|^)" +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      "\\r\\n]*))",
    "gi"
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);
    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  return arrData;
}

const stops = convertFilenameToData("stops.txt");
const routes = convertFilenameToData("routes.txt");
const trips = convertFilenameToData("trips.txt");
const stopTimes = convertFilenameToData("stop_times.txt");

const stopToParent = {};
const stopToName = {};
stops.forEach((stop) => {
  const parent = stop[5] || stop[0];
  stopToParent[stop[0]] = parent;

  stopToName[parent] = {
    name: stop[1].split(" - ")[0],
    lat: stop[2],
    lon: stop[3],
    value: 0,
    links: new Set(),
  };
});

const routeIdToRoute = {};
routes.forEach((route) => {
  routeIdToRoute[route[0]] = route[2];
});

const tripIdToRouteId = {};
trips.forEach((trip) => {
  if (trip[2]) {
    tripIdToRouteId[trip[2]] = routeIdToRoute[trip[0]];
  }
});

const stations = new Set();
const neighbors = {};
let prevStopId = null;
let prevTripId = null;
let prevSequence = null;
stopTimes.forEach((stopTime) => {
  const tripId = stopTime[0];
  const stopId = stopToParent[stopTime[3]];
  const sequence = stopTime[4];

  // int && < 100 = trams
  const routeName = tripIdToRouteId[tripId];
  if (
    !(Number.isSafeInteger(routeName) && routeName < 100) // && !['A', 'B', 'C'].includes(routeName)
  ) {
    return;
  }

  stations.add(stopId);
  stopToName[stopId].links.add(routeName);

  if (
    prevStopId &&
    prevSequence &&
    sequence > prevSequence &&
    prevTripId === tripId
  ) {
    const edge = [prevStopId, stopId];
    edge.sort();

    neighbors[edge.join("-")] = neighbors[edge.join("-")] + 1 || 1;

    // console.log(edge, [prevStopId, stopId]);
    // console.log(`${prevStopId} -> ${stopId}`);
  } else {
    // console.log(`stopId: ${stopId}, sequence: ${sequence}, tripId: ${tripId}`);
  }

  prevStopId = stopId;
  prevSequence = sequence;
  prevTripId = tripId;
});

const edgeValueRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
const nodeValueRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

let edges = Object.entries(neighbors).map(([key, value]) => {
  const [sourceName, targetName] = key.split("-");
  const source = stopToName[sourceName];
  const target = stopToName[targetName];

  target.value += value;
  source.value += value;

  if (target.value > nodeValueRange[1]) {
    nodeValueRange[1] = target.value;
  }

  if (target.value < nodeValueRange[0]) {
    nodeValueRange[0] = target.value;
  }

  if (source.value > nodeValueRange[1]) {
    nodeValueRange[1] = source.value;
  }

  if (source.value < nodeValueRange[0]) {
    nodeValueRange[0] = source.value;
  }

  if (value > edgeValueRange[1]) {
    edgeValueRange[1] = value;
  }

  if (value < edgeValueRange[0]) {
    edgeValueRange[0] = value;
  }

  return {
    source: source.name,
    target: target.name,
    value,
  };
});
edges = _.reverse(_.sortBy(edges, "value"));

let nodes = Array.from(stations).map((station) => {
  stopToName[station].links = Array.from(stopToName[station].links).sort();
  return stopToName[station];
});
nodes = _.reverse(_.sortBy(nodes, "value"));

console.log("nodes", nodes);
console.log("edges", edges);

fs.writeFileSync(
  path.join("data", "miserables.json"),
  JSON.stringify({ nodes, links: edges, nodeValueRange, edgeValueRange })
);
