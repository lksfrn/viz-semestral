import * as d3 from "d3";
import { useEffect } from "react";
import { sortBy, reverse } from "lodash";

const wchScale = {
  0: 2, // rect - not accessible
  1: (0.98 * (Math.sqrt(Math.PI) + 2)) / 2, // semicircle - semiaccessible
  2: Math.sqrt(Math.PI), // circle - accessible
};

function GColor(r, g, b) {
  r = typeof r === "undefined" ? 0 : r;
  g = typeof g === "undefined" ? 0 : g;
  b = typeof b === "undefined" ? 0 : b;
  return { r: r, g: g, b: b };
}

function createColorRange(c1, c2) {
  var colorList = [],
    tmpColor;
  for (var i = 0; i < 255; i++) {
    tmpColor = new GColor();
    tmpColor.r = Math.round(c1.r + (i * (c2.r - c1.r)) / 255);
    tmpColor.g = Math.round(c1.g + (i * (c2.g - c1.g)) / 255);
    tmpColor.b = Math.round(c1.b + (i * (c2.b - c1.b)) / 255);

    const r = tmpColor.r.toString(16);
    const g = tmpColor.g.toString(16);
    const b = tmpColor.b.toString(16);
    colorList.push(
      `#${r.length === 1 ? "0" + r : r}${g.length === 1 ? "0" + g : g}${
        b.length === 1 ? "0" + b : b
      }`
    );
  }
  return colorList;
}

// let zoom = d3.zoom().on("zoom", handleZoom);

function forceGraph({ nodes, edges }) {
  const lonRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  const latRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  nodes.forEach((node) => {
    if (node.lat < latRange[0]) {
      latRange[0] = node.lat;
    }

    if (node.lat > latRange[1]) {
      latRange[1] = node.lat;
    }

    if (node.lon < lonRange[0]) {
      lonRange[0] = node.lon;
    }

    if (node.lon > lonRange[1]) {
      lonRange[1] = node.lon;
    }
  });

  const lonDiff = lonRange[1] - lonRange[0];
  const latDiff = latRange[1] - latRange[0];

  const xyRatio = lonDiff / latDiff;

  const latStart = latRange[0];
  const lonStart = lonRange[0];

  const panelWidth = 256;
  const width = Math.max(1024, window.innerWidth) - panelWidth;
  const height = width / xyRatio;

  const offset = 0.05;
  const maxStrokeDefault = width / 200;
  const maxRadiusDefault = maxStrokeDefault / 1.2;

  let maxStroke = maxStrokeDefault;
  let maxRadius = maxRadiusDefault;

  function resetZoom() {
    maxStroke = maxStrokeDefault;
    maxRadius = maxRadiusDefault;

    const initialZoom = d3.zoomIdentity;
    initialZoom.x = (width * offset) / 2;
    initialZoom.y = (height * offset) / 2;
    initialZoom.k = 1 - offset;

    d3.select("svg g").attr("transform", initialZoom);
  }

  function renderBar(prop) {
    const bar = d3.select(".nodes");
    const children = bar.selectChildren().nodes();

    const arr =
      prop[0] === "-"
        ? reverse(sortBy(nodes, prop.slice(1)))
        : sortBy(nodes, prop);

    arr.forEach((node, i) => {
      const nodeEl = children[i];
      nodeEl.getElementsByTagName("div")[0].style =
        "width: " + 100 * node.value + "%";
      nodeEl.getElementsByTagName("span")[0].textContent = node.name;
    });
  }

  const graph = d3.select("#force-graph5");

  graph.selectChildren().remove();

  const svg = graph
    .append("svg")
    .style("border-bottom", "1px solid black")
    .attr("width", width)
    .attr("height", height);

  const wrapper = d3.select("#wrapper");
  wrapper.selectChildren(".panel").remove();

  const panel = wrapper.append("div");
  panel.style("width", `${panelWidth}px`);
  panel.attr("class", "panel");

  panel
    .append("button")
    .text("By Size")
    .on("click", () => renderBar("-value"));
  const btnHeight = panel
    .append("button")
    .text("By Name")
    .on("click", () => renderBar("name"))
    .node().offsetHeight;

  const nodesEl = panel
    .append("div")
    .attr("class", "nodes")
    .style("max-height", `${height - btnHeight}px`);

  const g = svg.append("g");

  function renderSelected() {
    const rectList = g.selectChildren("rect").nodes();
    const boomList = nodesEl.selectChildren("div").nodes();
    nodes.forEach((node, i) => {
      const rect = rectList[i];
      const boom = boomList[i];

      if (node.selected) {
        rect.setAttribute("stroke-width", Math.sqrt(maxStrokeDefault) / k);
        boom.style = "font-weight: bold";
      } else {
        rect.setAttribute("stroke-width", 1 / k);
        boom.style = "font-weight: normal";
      }
    });
  }

  const legend = wrapper
    .append("p")
    .attr("class", "legend")
    .text(
      "Wheelchair: Square - Not Accessible, Squircle - Partially Accessible, Circle - Accessible"
    );

  // legend
  //   .append("button")
  //   .text("Reset Zoom")
  //   .on("click", () => window.location.reload());

  resetZoom();

  let k = 1 - offset;
  function handleZoom(e) {
    const t = e.transform;

    if (t.k < 1 - offset) {
      t.k = 1 - offset;
      t.x = (width * offset) / 2;
      t.y = (height * offset) / 2;
    }

    k = t.k;
    maxRadius = maxRadiusDefault / t.k;
    maxStroke = maxStrokeDefault / t.k;

    g.selectChildren("rect")
      .nodes()
      .forEach((child) => {
        const id = child.getAttribute("x-id");
        const node = nodeMap[id];

        let r = node.value * maxRadius + 2;

        child.setAttribute("width", wchScale[node.wheelchair] * r);
        child.setAttribute("height", wchScale[node.wheelchair] * r);
        child.setAttribute("x", node.x - r);
        child.setAttribute("y", node.y - r);
        child.setAttribute("rx", (node.wheelchair * r) / 2);
      });

    renderSelected();

    g.selectChildren("line")
      .nodes()
      .forEach((child) => {
        const ratio = child.getAttribute("x-ratio");

        child.setAttribute(
          "stroke-width",
          Number(ratio) * maxStroke * Math.pow(1.05, t.k) + 1
        );
      });

    g.attr("transform", t);
  }

  svg.call(d3.zoom().on("zoom", handleZoom));

  // const colorRange = createColorRange(
  //   GColor(150, 250, 150),
  //   GColor(0, 150, 0)
  // );

  // https://r-charts.com/color-palette-generator/
  const colorRange = ([
    "#3146e6",
    "#5243da",
    "#6740ce",
    "#763ec2",
    "#833bb6",
    "#8d38aa",
    "#96359f",
    "#9e3293",
    "#a52f88",
    "#ab2c7d",
    "#b12971",
    "#b52666",
    "#ba235b",
    "#be2050",
    "#c21c45",
    "#c5183a",
    "#c8132f",
    "#cb0e22",
    "#ce0714",
    "#d00000",
  ]);

  edges.forEach((edge) => {
    const ratio = edge.value;
    const strokeWidth = ratio * maxStroke + 1;

    g.append("line")
      .attr(
        "x1",
        offset + ((nodeMap[edge.source].lon - lonStart) / lonDiff) * width
      )
      .attr(
        "y1",
        offset +
          height -
          ((nodeMap[edge.source].lat - latStart) / latDiff) * height
      )
      .attr(
        "x2",
        offset + ((nodeMap[edge.target].lon - lonStart) / lonDiff) * width
      )
      .attr(
        "y2",
        offset +
          height -
          ((nodeMap[edge.target].lat - latStart) / latDiff) * height
      )
      .attr("stroke", colorRange[Math.round(ratio * (colorRange.length - 1))])
      .attr("stroke-width", strokeWidth)
      .attr("x-ratio", ratio);
  });

  nodes.forEach((node) => {
    const nodeEl = nodesEl
      .append("div")
      .attr("class", "node")
      .on("click", () => {
        node.selected = !node.selected;
        renderSelected();
      });

    nodeEl.append("div");
    nodeEl.append("span");

    const x = offset + ((node.lon - lonStart) / lonDiff) * width;
    const y = offset + height - ((node.lat - latStart) / latDiff) * height;

    const ratio = node.value;
    const r = ratio * maxRadius + 2;
    const color = colorRange[Math.round(ratio * (colorRange.length - 1))];

    node.x = x;
    node.y = y;
    node.selected = false;

    g.append("rect")
      .attr("x", x - r)
      .attr("y", y - r)
      .attr("width", r * 2)
      .attr("height", r * 2)
      .attr("fill", color)
      .attr("x-id", node.id)
      .attr("x-ratio", ratio)
      .attr("rx", (node.wheelchair * r) / 2)
      .attr("x-x", x)
      .attr("x-y", y)
      .attr("x-wheelchair", node.wheelchair)
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("click", () => {
        node.selected = !node.selected;
        renderSelected();
      })
      .append("title")
      .text(node.name + "\n" + node.edges.join(", "));
  });

  renderBar("-value");
}

export default function ForceGraph(props) {
  useEffect(() => {
    forceGraph(props.data);
  }, [props.data]);

  return (
    <>
      <div id="wrapper" style={{ display: "flex", maxWidth: "100%" }}>
        <div id="force-graph5" style={{ flex: "1 0" }}></div>
      </div>

      <h1>
        VIZ - Semestral Work
        <br />
        <small>Lukas Frana, Tomas Omasta</small>
      </h1>

      <p>Prague's PID Weak spot stations visualization </p>
      <p> It contains both trams and subway trips </p>
      <p>
        This little project of ours detects the most throughput station in
        Prague's public transportation system PID.{" "}
      </p>
      <p> Different shapes for different wheelchair access </p>
      <p>
        {" "}
        Stations (nodes) are mapped with color and size. They encode the samme
        attribute. Attribute is sum of all trips going through the station.
      </p>
      <p>
        {" "}
        Links are mapped with color and width concerning the number of trips
        going through a givne link
      </p>
      <p>
        {" "}
        User can select specified stations by either clicking on nodes or on its
        name in right-side panel.
      </p>
      <p>
        {" "}
        Selected stations (nodes) are highlighted with a bigger stroke, the name
        in stations list is made bold.{" "}
      </p>
      <p>
        {" "}
        The stations in right-side oanel can be ordered by size, or by value.{" "}
      </p>
      <p> The visualization implements zoom and pan as well. </p>
    </>
  );
}
