import { getColor } from "./colors";
import * as d3 from "d3";
import { sortBy, reverse } from "lodash";

export const panelWidth = 256;
export const offset = 0.05;
const wheelchairScale = {
  0: 2, // rect - not accessible
  1: (0.98 * (Math.sqrt(Math.PI) + 2)) / 2, // semicircle - semiaccessible
  2: Math.sqrt(Math.PI), // circle - accessible
};

export function renderPanel(nodes, sortByProp) {
  const panel = d3.select(".nodes");
  const children = panel.selectChildren().nodes();

  const arr =
    sortByProp[0] === "-"
      ? reverse(sortBy(nodes, sortByProp.slice(1)))
      : sortBy(nodes, sortByProp);

  arr.forEach((node, i) => {
    const nodeEl = children[i];
    nodeEl.getElementsByTagName("div")[0].style =
      "width: " + 100 * node.value + "%";
    nodeEl.getElementsByTagName("span")[0].textContent = node.name;
  });
}

export function renderNode(g, node, onClick) {
  return g
    .append("rect")
    .attr("x", node.x - node.r)
    .attr("y", node.y - node.r)
    .attr("width", node.r * 2)
    .attr("height", node.r * 2)
    .attr("fill", node.color)
    .attr("x-id", node.id)
    .attr("rx", (node.wheelchair * node.r) / 2)
    .attr("x-wheelchair", node.wheelchair)
    .attr("stroke", "red")
    .attr("stroke-width", 0)
    .style("cursor", "pointer")
    .on("click", onClick)
    .append("title")
    .text(node.name + "\n" + node.edges.join(", "));
}

export function preparePositionFunc(offset, lonRange, latRange, width, height) {
  const lonDiff = lonRange[1] - lonRange[0];
  const latDiff = latRange[1] - latRange[0];
  const latStart = latRange[0];
  const lonStart = lonRange[0];

  function inner(node) {
    const x = offset + ((node.lon - lonStart) / lonDiff) * width;
    const y = offset + height - ((node.lat - latStart) / latDiff) * height;

    return { x, y };
  }
  return inner;
}

export function updateNodeConfig(node, position, maxRadius) {
  node.x = position.x;
  node.y = position.y;
  node.selected = false;
  node.r = node.value * maxRadius + 2;
  node.color = getColor(node.value);
}

export function renderSelected(g, nodes, nodesEl, config) {
  const rectList = g.selectChildren("rect").nodes();
  const boomList = nodesEl.selectChildren("div").nodes();
  nodes.forEach((node, i) => {
    const rect = rectList[i];
    const boom = boomList[i];

    if (node.selected) {
      rect.setAttribute(
        "stroke-width",
        Math.sqrt(config.maxStrokeDefault) / Math.pow(1.1, config.k)
      );
      boom.style = "font-weight: bold";
    } else {
      rect.setAttribute("stroke-width", 0);
      boom.style = "font-weight: normal";
    }
  });
}

export function getConfig(lonRange, latRange) {
  const lonDiff = lonRange[1] - lonRange[0];
  const latDiff = latRange[1] - latRange[0];
  const xyRatio = lonDiff / latDiff;
  const width = Math.max(1024, window.innerWidth) - panelWidth;
  const height = width / xyRatio;
  const k = 1 - offset;

  const maxStrokeDefault = width / 200;
  const maxRadiusDefault = maxStrokeDefault / 1.2;
  return {
    lonDiff,
    latDiff,
    xyRatio,
    width,
    height,
    maxStrokeDefault,
    maxRadiusDefault,
    k,
  };
}

export function resetZoom(config) {
  const initialZoom = d3.zoomIdentity;
  initialZoom.x = (config.width * offset) / 2;
  initialZoom.y = (config.height * offset) / 2;
  initialZoom.k = 1 - offset;

  d3.select("svg g").attr("transform", initialZoom);
}

export function getZoomHandler(config, g, nodes, nodeMap, nodesEl) {
  return (e) => {
    const t = e.transform;

    if (t.k < 1 - offset) {
      t.k = 1 - offset;
      t.x = (config.width * offset) / 2;
      t.y = (config.height * offset) / 2;
    }

    config.k = t.k;

    g.selectChildren("rect")
      .nodes()
      .forEach((child) => {
        const id = child.getAttribute("x-id");
        const node = nodeMap[id];

        let r = node.value * (config.maxRadiusDefault / config.k) + 2;

        child.setAttribute("width", wheelchairScale[node.wheelchair] * r);
        child.setAttribute("height", wheelchairScale[node.wheelchair] * r);
        child.setAttribute("x", node.x - r);
        child.setAttribute("y", node.y - r);
        child.setAttribute("rx", (node.wheelchair * r) / 2);
      });

    renderSelected(g, nodes, nodesEl, config);

    g.selectChildren("line")
      .nodes()
      .forEach((child) => {
        const ratio = child.getAttribute("x-ratio");

        child.setAttribute(
          "stroke-width",
          Number(ratio) *
            (config.maxStrokeDefault / config.k) *
            Math.pow(1.05, t.k) +
            1
        );
      });

    g.attr("transform", t);
  };
}
