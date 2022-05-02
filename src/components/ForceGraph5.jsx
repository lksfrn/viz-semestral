import * as d3 from "d3";
import { useEffect } from "react";

function forceGraph({ nodes, links }) {
  const width = 1280;
  const height = 960;
  const offset = 40;
  const radius = 7;

  d3.select("svg").remove();
  const svg = d3
    .select("#force-graph5")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("stroke", "black")
    .attr("fill", "#f5f5f5");

  const innerWidth = width - 2 * offset;
  const innerHeight = height - 2 * offset;

  const lonRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  const latRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

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
  const lonStart = lonRange[0];
  const latStart = latRange[0];

  const nameToNode = {};
  nodes.forEach((node) => {
    nameToNode[node.name] = node;

    const x = offset + ((node.lon - lonStart) / lonDiff) * innerWidth;
    const y =
      offset + innerHeight - ((node.lat - latStart) / latDiff) * innerHeight;

    svg
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", radius)
      .attr("fill", "black");

    svg
      .append("text")
      .attr("x", x + 15)
      .attr("y", y + 4)
      .attr("stroke", "black")
      .style("font-size", 14)
      .text(node.name);
  });

  links.map((link) => {
    svg
      .append("line")
      .attr(
        "x1",
        offset +
          ((nameToNode[link.source].lon - lonStart) / lonDiff) * innerWidth
      )
      .attr(
        "y1",
        offset +
          innerHeight -
          ((nameToNode[link.source].lat - latStart) / latDiff) * innerHeight
      )
      .attr(
        "x2",
        offset +
          ((nameToNode[link.target].lon - lonStart) / lonDiff) * innerWidth
      )
      .attr(
        "y2",
        offset +
          innerHeight -
          ((nameToNode[link.target].lat - latStart) / latDiff) * innerHeight
      )
      .attr("stroke", "black");
  });
}

export default function ForceGraph(props) {
  useEffect(() => {
    forceGraph(props.data);
  }, [props.data]);

  return <div id="force-graph5"></div>;
}
