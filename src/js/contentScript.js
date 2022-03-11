import { $, jQuery } from "jquery";

function add(a, b) {
  return a + b;
}

function countClick() {
  chrome.runtime.sendMessage(
    { message: "incrementCounter" },
    function (response) {
      console.log(response.result);
    }
  );
}

const body = document.querySelector("body");
body.addEventListener("click", () => countClick());

module.exports = { add };
