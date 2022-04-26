import * as d3 from "d3";
import { useEffect } from "react";

const types = ["licensing", "suit", "resolved"]

function linkArc(d) {
  const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
  return `
    M${d.source.x},${d.source.y}
    A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  `;
}

const color = d3.scaleOrdinal(types, d3.schemeCategory10)

const drag = simulation => {
  
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/disjoint-force-directed-graph
function forceGraph(
  data,
  {
    nodeId = (d) => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength,
    linkSource = ({ source }) => source, // given d in links, returns a node identifier string
    linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    invalidation, // when this promise resolves, stop the simulation
  } = {}
) {
  const links = data.links.map((d) => Object.create(d));
  const nodes = data.nodes.map((d) => Object.create(d));

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3.forceLink(links).id((d) => d.id)
    )
    .force("charge", d3.forceManyBody().strength(-400))
    .force("x", d3.forceX())
    .force("y", d3.forceY());

  const svg = d3
    .select("#force-graph3")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .style("font", "12px sans-serif");

  // Per-type markers, as they don't inherit styles.
  svg
    .append("defs")
    .selectAll("marker")
    .data(types)
    .join("marker")
    .attr("id", (d) => `arrow-${d}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -0.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("fill", color)
    .attr("d", "M0,-5L10,0L0,5");

  const link = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 1.5)
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("stroke", (d) => color(d.type))
    .attr("marker-end", (d) => `url(${new URL(`#arrow-${d.type}`, location)})`);

  const node = svg
    .append("g")
    .attr("fill", "currentColor")
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(drag(simulation));

  node
    .append("circle")
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .attr("r", 4);

  node
    .append("text")
    .attr("x", 8)
    .attr("y", "0.31em")
    .text((d) => d.id)
    .clone(true)
    .lower()
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 3);

  simulation.on("tick", () => {
    link.attr("d", linkArc);
    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  // invalidation.then(() => simulation.stop());

  return svg.node();
}

export default function ForceGraph(props) {
  useEffect(() => {
    forceGraph(props.data, {
      nodeId: (d) => d.id,
      nodeGroup: (d) => d.group,
      nodeTitle: (d) => `${d.id}\n${d.group}`,
      linkStrokeWidth: (l) => Math.sqrt(l.value),
      width: 1200,
      height: 800,
      // invalidation, // a promise to stop the simulation when the cell is re-run
    });
  }, [props.data]);

  return <div id="force-graph3"></div>;
}
