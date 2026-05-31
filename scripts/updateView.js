const urlParams = new URLSearchParams(window.location.search);
const obj = Object.fromEntries(urlParams.entries());

const content = decodeURIComponent(obj.txt);

document.getElementById("current").innerText = decodeURIComponent(obj.app);
document.getElementById("latest").innerText = decodeURIComponent(obj.new);
if (navigator.userAgentData.brands[0].brand === "Chromium" && navigator.userAgentData.brands[0].version >= 146){
  document.getElementById("content").setHTML(marked.parse(content));
} else if (Element.prototype.setHTML){
  document.getElementById("content").setHTML(marked.parse(content));
} else {
  document.getElementById("content").innerText = content;
  document.getElementById("content").style.whiteSpace = "pre-wrap";
  document.getElementById("content").style.fontFamily = "monospace";
}
document.querySelector("a").href = decodeURIComponent(obj.url);
