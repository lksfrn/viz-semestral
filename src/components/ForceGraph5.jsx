import * as d3 from "d3";
import { useEffect } from "react";
import { getColor } from "./colors";
import {
  preparePositionFunc,
  updateNodeConfig,
  renderNode,
  renderPanel,
  renderSelected,
  getConfig,
  resetZoom,
  getZoomHandler,
  offset,
  panelWidth,
} from "./utils";

function forceGraph({ nodes, edges, lonRange, latRange }) {
  // define config
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const config = getConfig(lonRange, latRange);

  // create html layout start
  const graph = d3.select("#force-graph5");

  graph.selectChildren().remove();

  const svg = graph
    .append("svg")
    .style("border-bottom", "1px solid black")
    .attr("width", config.width)
    .attr("height", config.height);

  const wrapper = d3.select("#wrapper");
  wrapper.selectChildren(".panel").remove();

  const panel = wrapper.append("div");
  panel.style("width", `${panelWidth}px`);
  panel.attr("class", "panel");

  panel
    .append("button")
    .text("By Size")
    .on("click", () => renderPanel(nodes, "-value"));
  const btnHeight = panel
    .append("button")
    .text("By Name")
    .on("click", () => renderPanel(nodes, "name"))
    .node().offsetHeight;

  const nodesEl = panel
    .append("div")
    .attr("class", "nodes")
    .style("max-height", `${config.height - btnHeight}px`);

  const g = svg.append("g");

  wrapper
    .append("p")
    .attr("class", "legend")
    .text(
      "Wheelchair: Square - Not Accessible, Squircle - Partially Accessible, Circle - Accessible"
    );
  
  // create html layout end

  resetZoom(config);

  const handleZoom = getZoomHandler(config, g, nodes, nodeMap, nodesEl); // handle zoom

  svg.call(d3.zoom().on("zoom", handleZoom));

  const getPosition = preparePositionFunc(
    offset,
    lonRange,
    latRange,
    config.width,
    config.height
  );

  // render edges
  edges.forEach((edge) => {
    const ratio = edge.value;
    const strokeWidth = ratio * (config.maxStrokeDefault / config.k) + 1;

    const posSource = getPosition(nodeMap[edge.source]);
    const posTarget = getPosition(nodeMap[edge.target]);
    g.append("line")
      .attr("x1", posSource.x)
      .attr("y1", posSource.y)
      .attr("x2", posTarget.x)
      .attr("y2", posTarget.y)
      .attr("stroke", getColor(ratio))
      .attr("stroke-width", strokeWidth)
      .attr("x-ratio", ratio);
  });

  // re-render selected nodes
  const toggleSelected = (node) => () => {
    node.selected = !node.selected;
    renderSelected(g, nodes, nodesEl, config);
  };

  // render nodes
  nodes.forEach((node) => {
    const nodeEl = nodesEl
      .append("div")
      .attr("class", "node")
      .on("click", toggleSelected(node));

    nodeEl.append("div");
    nodeEl.append("span");

    const position = getPosition(node);
    updateNodeConfig(node, position, config.maxRadiusDefault);
    renderNode(g, node, toggleSelected(node));
  });

  // render right panel with stations
  renderPanel(nodes, "-value");
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

      {/* <p>Prague's PID Weak spot stations visualization </p>
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
      <p> The visualization implements zoom and pan as well. </p> */}
    </>
  );
}
