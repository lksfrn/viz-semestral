import * as d3 from "d3";
import { zoomIdentity } from "d3";
import { useEffect } from "react";

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
  console.log(nodeMap);

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

  const width = window.innerWidth;
  const height = width / xyRatio;

  const offset = 0.05;
  const maxStrokeDefault = 16;
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

  const graph = d3.select("#force-graph5");

  graph.selectChildren().remove();

  const svg = graph
    .append("svg")
    .style("border-bottom", "1px solid black")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g");

  // const legend = g.append("rect").attr("width", 200).attr("height", 150).attr('fill', '#fff').attr('stroke', '#000')
  g.append("text")
    .attr("stroke", "black")
    .style("font-size", 14)
    .text("node.name");
  // legend.append('rect').attr('x', 10).attr('y', 10).text('Legend')

  graph
    .append("button")
    .text("Reset Zoom")
    .on("click", () => window.location.reload());

  graph
    .append("p")
    .text(
      "Wheelchair: Square - Not Accessible, Squircle - Partially Accessible, Circle - Accessible"
    );

  resetZoom();

  function handleZoom(e) {
    const t = e.transform;

    if (t.k < 1 - offset) {
      t.k = 1 - offset;
      t.x = (width * offset) / 2;
      t.y = (height * offset) / 2;
    }

    maxRadius = maxRadiusDefault / t.k;
    maxStroke = maxStrokeDefault / t.k;

    g.selectChildren("rect")
      .nodes()
      .forEach((child) => {
        const id = child.getAttribute("x-id");
        const node = nodeMap[id];

        let r = node.value * maxRadius * Math.pow(1.1, t.k) + 2;

        child.setAttribute("width", wchScale[node.wheelchair] * r);
        child.setAttribute("height", wchScale[node.wheelchair] * r);
        child.setAttribute("x", node.x - r);
        child.setAttribute("y", node.y - r);
        child.setAttribute("rx", (node.wheelchair * r) / 2);
        child.setAttribute("stroke-width", 1 / t.k);
      });

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

  const colorRange = createColorRange(
    GColor(100, 255, 0),
    GColor(255, 100, 100)
  );

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
    const x = offset + ((node.lon - lonStart) / lonDiff) * width;
    const y = offset + height - ((node.lat - latStart) / latDiff) * height;

    const ratio = node.value;
    const r = ratio * maxRadius + 2;
    const color = colorRange[Math.round(ratio * (colorRange.length - 1))];

    node.x = x;
    node.y = y;

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
      .append("title")
      .text(node.name + "\n" + node.edges.join(", "));

    // g
    //   .append("text")
    //   .attr("x", x + 15)
    //   .attr("y", y + 4)
    //   .attr("stroke", "black")
    //   .style("font-size", 14)
    //   .text(node.name);
  });
}

export default function ForceGraph(props) {
  useEffect(() => {
    forceGraph(props.data);
  }, [props.data]);

  return (
    <>
      <div id="force-graph5"></div>

      {/* <div style={{ textAlign: "text" }}>
        <button onClick={() => {
          d3.select("svg").remove();
        }}>Reset zoom</button>
      </div> */}
    </>
  );
}
