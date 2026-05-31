let windowId = null;
chrome.action.onClicked.addListener(function(){
  open_Main();
});
chrome.windows.onRemoved.addListener(closedId => {
  if (closedId === windowId) windowId = null;
});
chrome.commands.onCommand.addListener(command => {
  if (command === "main_window_open") open_Main();
})
function open_Main(){
  if (windowId === null){
    chrome.windows.create({
      url: "popup2.html",
      type: "popup",
      height: 640,
      width: 1248
    }, callback => {
      windowId = callback.id;
    });
  } else {
    chrome.windows.update(windowId, { focused: true });
  }
}
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message);
  if (message.type === "open"){
    open_Main();
  } else if (message.type === "closeWindow"){
    chrome.windows.remove(sender.tab.windowId);
  }
});
chrome.storage.sync.get(['mode0', 'mode3'], storageData => {
  // 初期状態（main.jsでバージョンアップ後のやつに調整されるからセーフ）
  if (JSON.stringify(storageData) !== "{}") return;

  chrome.storage.sync.set({
    mode0: [
      {
        "title": "お知らせ",
        "content": "NDV ティッカーをご利用いただきありがとうございます。",
        "enabled": true,
        "type": "custom",
        "shortcutId": null
      },
      {
        "title": "最高気温（℃）",
        "content": "",
        "enabled": true,
        "type": "shortcut",
        "shortcutId": "weather/temperature/high"
      }
    ],
    mode3: [ "aaaaああああ｜｜", "文章あいうえお文章あいうえお文章あいうえお文章あいうえお文章あいうえお文章あいうえお文章あいうえおabc-0234", "text" ],
    settings: {
      autorecord: false,
      fixitem: [false, false, false, false, false],
      soraview: false,
      details: {
        earthquake: {
          intensity: "1",
          magnitude: "0",
          depth: "1000"
        },
        eew: {
          intensity: "1",
          unknown: "1",
          magnitude: "0",
          depth: "-1"
        }
      },
      clipboard: { eew: false, quake: false },
      interval: {
        iedred7584EEW: 5000,
        nhkQuake: 12000,
        jmaDevFeed: 15000,
        tenkiJPtsunami: 30000,
        wniMScale: 30000,
        wniSorabtn: 30000,
        wniRiver: 300000,
        wniliveTimeTable: 240000,
        tepcoTeiden: 60000
      },
      volume: {
        eewL: 100,
        eewH: 10,
        eewP: 100,
        gl: 100,
        ntc: 100,
        spW: 100,
        tnm: 100,
        hvra: 100,
        fldoc: 100
      },
      theme: { color: 0 },
      sendEEW: false
    },
    app: { lastVer: "", newUser: true }
  });
});
