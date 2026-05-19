(() => {

const tfMonitorBase = document.getElementById("tfMonitorBase");

class TrafficTracker {
  #field = {};
  #timeInt = 0;
  #viewName = "";
  constructor (viewName, visible = true){
    const field = (this.#field = {
      item: document.createElement("div"),
      title: document.createElement("div"),
      time: document.createElement("div")
    });
    field.item.append(field.title, field.time);
    field.item.classList.add("tfMonitorItem");
    field.title.classList.add("tfMonitorTitle");
    field.time.classList.add("tfMonitorTime");
    tfMonitorBase.appendChild(field.item);
    field.title.textContent = this.#viewName = viewName;
    field.time.textContent = "---";
    field.item.style.display = visible ? "block" : "none";
  }
  update (target = new Date()){
    this.#timeInt = target - 0;
    this.#field.time.textContent = ("000"+target.getFullYear()).slice(-4)+"/"+("0"+(target.getMonth()+1)).slice(-2)+"/"+("0"+target.getDate()).slice(-2)+" "+("0"+target.getHours()).slice(-2)+":"+("0"+target.getMinutes()).slice(-2)+":"+("0"+target.getSeconds()).slice(-2)+"."+("000"+target.getMilliseconds()).slice(-3);
  }
  get lastTime (){
    return this.#timeInt;
  }
  get visible (){
    return !this.#field.item.style.display == "none";
  }
  set visible (flag){
    this.#field.item.style.display = flag ? "block" : "none";
  }
  get viewName (){
    return this.#viewName;
  }
}
window.TrafficTracker = TrafficTracker;

/** 一つの通信に一つ用意する */
class DataLoader {
  #key = "";
  #url = "";
  constructor (key, url, options = {}){
    if (!key) throw new Error('Argument "key" is required.'); else key = key + "";
    if (!url) throw new Error('Argument "url" is required.'); else url = url + "";
    if (typeof options !== "object") throw new Error('The argument "options" must be object.');
    this.#key = key;
    this.#url = url;
  }
  get url (){
    return this.#url;
  }
  set url (destination){
    this.#url = destination;
  }
}

/** 一つのWebSocket通信に一つ用意する */
class WebSocketLoader extends DataLoader {
  constructor (key, url, options = {}){
    super(key, url, options);
  }
}

/** 一つのHTTP通信に一つ用意する */
class HttpLoader extends DataLoader {
  constructor (key, url, options = {}){
    super(key, url, options);
    if (!options.method) options.method = "GET";
    options.method = options.method.toLocaleUpperCase();
  }
}

const it = window.DataOperator = {
  area: {
    url: "https://www.jma.go.jp/bosai/common/const/area.json",
    data: null,

    async load (){ return this.data = await fetch(this.url).then(res => res.json()); },
    async getData (){
      if (this.data === null) await this.load();
      return this.data;
    }
  },
  tsunami: {
    url_list: "https://www.jma.go.jp/bosai/tsunami/data/list.json",
    list: [],
    forecasts: [],
    earthquakes: [],
    expire: 0,
    warnLevel: 0,
    text: {
      forecast_jp: "",
      forecast_en: "",
      obs_jp: "",
      obs_en: "",
      whole: "",
      head: [],
      forecast_news: [],
      obs_news: []
    },
    lastEventId: "",
    eventIdList41: [],
    eventIdList51: [],
    isIssued: false,
    onUpdate (){},

    tracker_list: new TrafficTracker("JMA / Tsunami / list.json"),
    tracker_vtse41: new TrafficTracker("JMA / Tsunami / VTSE41"),
    tracker_vtse51: new TrafficTracker("JMA / Tsunami / VTSE51"),
    async load (){
      if (this.isIssued && Date.now() - this.expire >= 0) this.isIssued = false;
      const list = await fetch(this.url_list + "?_=" + Date.now()).then(res => res.json());
      this.tracker_list.update();
      if (!list.length) return;
      const latestEventId = list[0].eid;
      let vtse41, vtse51;
      for (const item of list){
        if (item.eid !== latestEventId) break;
        if (item.ift.includes("_K")) continue; // これが訓練情報らしい
        const found = !(this.list.find(({ ctt }) => ctt === item.ctt)); // 新しく見つかった情報かどうかを判別
        if (!found) continue;
        if (item.json.includes("VTSE41") && !vtse41) vtse41 = item.json;
        if (item.json.includes("VTSE51") && item.ttl === "津波観測に関する情報" && !vtse51) vtse51 = item.json;
        if (vtse41 && vtse51) break;
      }
      this.list = list;
      if (vtse41) this.isIssued = await this.vtse41(vtse41);
      if (this.isIssued && vtse51) await this.vtse51(vtse51);
      this.text.whole = this.text.forecast_jp + this.text.obs_jp + "\n\n" + this.text.forecast_en + this.text.obs_en;
      if (vtse41 || vtse51) this.onUpdate(this, vtse41, vtse51);
    },

    async vtse41 (filename){
      const data = await fetch("https://www.jma.go.jp/bosai/tsunami/data/" + filename).then(res => res.json());
      this.tracker_vtse41.update();
      this.earthquakes = data.Body.Earthquake;
      this.forecasts = data.Body.Tsunami.Forecast.Item;
      this.text.forecast_jp = "";
      this.text.forecast_en = "";
      this.text.head = [];
      let isAllCleared = true;
      let warnLevel = 0;
      this.text.forecast_news = [];
      const isFirstReport = !this.eventIdList41.includes(data.Head.EventID);
      if (isFirstReport) this.eventIdList41.push(data.Head.EventID);
      for (const item of this.forecasts){
        const {jp: maxHeightJP, en: maxHeightEN} = item.MaxHeight ? translateMaxHeight(item.MaxHeight?.TsunamiHeight, item.MaxHeight?.Condition ?? "", true) : { jp: "", en: "" };
        const arrivalTime = item.FirstHeight?.Condition ?? (item.FirstHeight ? new Date(item.FirstHeight.ArrivalTime).strftime("%H時%M分") : null);
        let categoryText = "";
        if (item.Category.Kind.Code === "52" || item.Category.Kind.Code === "53"){
          categoryText = "大津波警報";
          if (warnLevel < 4) warnLevel = 4;
        } else if (item.Category.Kind.Code === "51"){
          categoryText = "津波警報";
          if (warnLevel < 3) warnLevel = 3;
        } else if (item.Category.Kind.Code === "62"){
          categoryText = "津波注意報";
          if (warnLevel < 2) warnLevel = 2;
        } else if (item.Category.Kind.Code === "71" || item.Category.Kind.Code === "72" || item.Category.Kind.Code === "73"){
          categoryText = "津波予報";
          if (warnLevel < 1) warnLevel = 1;
        } else continue;
        const jpText = "【" + categoryText + "】 " + item.Area.Name + (maxHeightJP ? " " + maxHeightJP : "") + (arrivalTime ? " （" + arrivalTime + "）" : "");
        if (isFirstReport || item.MaxHeight?.Revise){
          this.text.forecast_news.push((item.MaxHeight?.Revise ? "［" + item.MaxHeight.Revise + "］ " : "") + jpText);
        }
        this.text.forecast_jp += "\n" + jpText;
        this.text.forecast_en += "\n* [" + (maxHeightEN ? maxHeightEN : "") + " Tsunami] is in " + item.Area.enName;
        this.text.head.push(item.Area.Name + (categoryText === "津波予報" ? "　若干の海面変動" : "") + (maxHeightJP ? " " + maxHeightJP : "") + (arrivalTime ? " (" + arrivalTime + ")" : "")) + "　 ";
        isAllCleared = false;
      }
      this.warnLevel = warnLevel;

      data.Body.Comments.WarningComment.Code = data.Body.Comments.WarningComment.Code.replace("0121 0122 0123 0124", "0121").replace("0122 0123 0124", "0122").replace("0123 0124", "0123");
      for (const item of data.Body.Comments.WarningComment.Code.split(" ")){
        this.text.forecast_jp += "\n" + AdditionalComments[item].jp;
        this.text.forecast_en += "\n* " + AdditionalComments[item].en;
      }

      if ("ValidDateTime" in data.Head){
        const validDate = new Date(data.Head.ValidDateTime);
        if (Date.now() - validDate < 0){
          this.text.forecast_jp += "\n津波予報は" + validDate.strftime("%H時%M分") + "まで有効です。";
          this.text.forecast_en += "\n* Tsunami Forecast is in effect until " + validDate.strftime("%I:%M %p") + ".";
          this.expire = validDate - 0;
          return true;
        } else {
          return false;
        }
      } else {
        this.expire = 4102412400000; // 2100年
        this.text.forecast_jp += "\n今後の情報にご注意ください。";
        this.text.forecast_en += "\n* Please stay tuned for further updates.";
        return !isAllCleared;
      }
    },

    /** 津波観測に関する情報だけを取り扱う */
    async vtse51 (filename){
      const data = await fetch("https://www.jma.go.jp/bosai/tsunami/data/" + filename).then(res => res.json());
      this.tracker_vtse51.update();
      if (!data.Body.Tsunami.Observation) return;
      this.text.obs_jp = "";
      this.text.obs_en = "";
      this.text.obs_news = [];
      const isFirstReport = !this.eventIdList51.includes(data.Head.EventID);
      if (isFirstReport) this.eventIdList51.push(data.Head.EventID);
      for (const area of data.Body.Tsunami.Observation.Item){
        for (const item of area.Station){
          const obsDate = new Date(item.MaxHeight.DateTime);
          const maxHeight = translateMaxHeight(item.MaxHeight.TsunamiHeight, item.MaxHeight.Condition ?? "");
          const jpText = (() => {
            if (item.MaxHeight.Condition && item.MaxHeight.Condition.includes("欠測")){
              return "【欠測】 " + item.Name + "（" + area.Area.Name + "） ";
            }
            return "【観測】 " + item.Name + "（" + area.Area.Name + "） " + (isNaN(obsDate - 0) ? "" : obsDate.strftime("%H時%M分") + " ") + maxHeight.jp;
          })();
          if (isFirstReport || item.MaxHeight.Revise){
            this.text.obs_news.push((item.MaxHeight.Revise ? "［" + item.MaxHeight.Revise + "］ " : "") + jpText);
          }
          this.text.obs_jp += "\n" + jpText;
          if (item.MaxHeight.Condition && item.MaxHeight.Condition.includes("欠測")){
            this.text.obs_en += "\n* [Data Failure] " + item.enName + ", " + area.Area.enName + ".";
          } else {
            this.text.obs_en += "\n* [Tsunami Observed] " + item.enName + ", " + area.Area.enName + ", " + maxHeight.en + ".";
          }
        }
      }
    }
  },
  earthquake: {
    jma: {
      url_list: "https://www.jma.go.jp/bosai/quake/data/list.json",
      jsonlist: [],
      tracker_list: new TrafficTracker("JMA / Quake / list.json", false),

      shindo_list: {"1": 1, "2": 2, "3": 3, "4": 4, "震度５弱以上未入電": 5, "5-": 6, "5+": 7, "6-": 8, "6+": 9, "7": 10},
      magnitude_not_a_number: {"M不明": -901, "M8を超える巨大地震": -902, "Ｍ不明": -901, "Ｍ８を超える巨大地震": -902},
      async initlist (){
        /** @type {{ctt: String, eid: String, rdt: String, ttl: String, ift: String, ser: Number, at: String, anm: String, acd: String, cod: String, mag: String, maxi: String, maxInt: {code: String, maxi: String, city: {code: String, maxi: String}[]}[], json: String, en_ttl: String, en_anm: String}[]} */
        const list = await fetch(this.url_list + "?_=" + Date.now()).then(res => res.json());
        while (list[0]){
          const info = list.shift();
          info.eid
        }
      },
      async loadlist (){
        /** @type {{ctt: String, eid: String, rdt: String, ttl: String, ift: String, ser: Number, at: String, anm: String, acd: String, cod: String, mag: String, maxi: String, maxInt: {code: String, maxi: String, city: {code: String, maxi: String}[]}[], json: String, en_ttl: String, en_anm: String}[]} */
        const list = await fetch(this.url_list + "?_=" + Date.now()).then(res => res.json());
        this.tracker_list.update();
        while (!this.jsonlist.includes(list[0].json)){
          const info = list.shift();
        }
      },
      /**
       * @param {String} src Source URL
       * @param {"vxse51" | "vxse52" | "vxse53"} type 情報のあれ
       */
      async vxse5x (src, type){
        const originData = await fetch(src).then(res => res.json());
        const processedData = {
          type: type.toUpperCase(),
          receiveTime: Date.now(),
          pressTime: new Date(originData.Control.DateTime),
          reportTime: new Date(originData.Head.ReportDateTime),
          targetTime: new Date(originData.Head.TargetDateTime),
          maxIntensity: null,
          shindoList: null,
          originTime: null,
          hypocenter: null,
          magnitude: null,
          isDistant: originData.Head.Title === "遠地地震に関する情報",
          tsunami: null,
          comments: {
            codes: [],
            ja_JP: [],
            en_US: []
          }
        };
        if (originData.Body.Comments.ForecastComment){
          for (const comment of originData.Body.Comments.ForecastComment){
            processedData.comments.codes.push(comment.Code);
            processedData.comments.ja_JP.push(comment.Text);
            processedData.comments.en_US.push(AdditionalComments[comment.Code].en ?? "");
          }
        }
        if (originData.Body.Comments.FreeFormComment) processedData.comments.ja_JP.push(originData.Body.Comments.FreeFormComment);
        if (originData.Body.Intensity){
          processedData.shindoList = {
            regions: [],
            cities: type === "vxse53" ? [] : null // 遠地地震の時は.Body.Intensityがないからセーフ
          };
          for (const pref of originData.Body.Intensity.Observation.Pref){
            for (const region of pref.Area){
              processedData.shindoList.regions.push({
                code: region.Code,
                name: region.Name,
                maxInt: this.shindo_list[region.MaxInt]
              });
              if (!region.City && !processedData.shindoList.cities) continue;
              for (const city of region.City){
                processedData.shindoList.cities.push({
                  code: city.Code,
                  name: city.Name,
                  maxInt: this.shindo_list[city.MaxInt]
                });
              }
            }
          }
        }
        if (originData.Body.Earthquake){
          processedData.originTime = new Date(originData.Body.Earthquake.OriginTime);
          processedData.hypocenter.name = originData.Body.Earthquake.Hypocenter.Area.Name;
          processedData.hypocenter.code = originData.Body.Earthquake.Hypocenter.Area.Code;
          const coordinate = Array.from(originData.Body.Earthquake.Hypocenter.Area.Coordinate.matchAll(/[\+\-][\d\.]+/g));
          processedData.hypocenter.coordinate = {
            latitude: coordinate[0][0]-0,
            longitude: coordinate[1][0]-0
          };
          processedData.hypocenter.depth = coordinate[2] ? -coordinate[2][0] : null;
          processedData.magnitude = this.magnitude_not_a_number[originData.Body.Earthquake.Magnitude] ?? (originData.Body.Earthquake.Magnitude-0);
        }
        it.earthquake[type](processedData);
      }
    },
    dmdata: {},
    events: {},

    source: "jma",
    notice: false, // 初期化時にだけfalse
    async vxse51 (data){ // 震度速報

    },
    // ＊重要＊ -901 M不明, -902 M8を超える巨大地震
    async vxse52 (data){ // 震源情報

    },
    async vxse53 (data){ // 地震情報・遠地地震に関する情報

    },
    async vxse61 (data){ // 震源要素更新

    },
    async vxse62 (data){ // 長周期地震動

    },
    async view (id){

    },
    get latestId (){
      return 0;
    },
    quakeList: [],
    quakeData: {
      "20210213230800": {
        reports: [
          {
            type: "VXSE51",
            receiveTime: new Date(1613225377059),
            pressTime: new Date(1613225376000),
            reportTime: new Date(1613225340000),
            targetTime: new Date(1613225280000),
            maxIntensity: 9,
            shindoList: {
              regions: [
                { code: "250", name: "福島県中通り", maxInt: 9 },
                { code: "251", name: "福島県浜通り", maxInt: 9 },
                { code: "221", name: "宮城県南部", maxInt: 8 },
                { code: "222", name: "宮城県中部", maxInt: 8 },
                { code: "220", name: "宮城県北部", maxInt: 7 },
                { code: "243", name: "山形県置賜", maxInt: 6 },
                { code: "300", name: "茨城県北部", maxInt: 6 }
              ],
              cities: null
            },
            originTime: null,
            hypocenter: null,
            magnitude: null,
            isDistant: false,
            tsunami: null,
            comments: {
              codes: [ "0217" ],
              ja_JP: [ "今後の情報に注意してください。", "テストデータああああああああああああああ！" ],
              en_US: [ "Stay tuned for further updates.", "Test Data AAAAAAAAAAAAAAA" ]
            }
          },
          {
            type: "VXSE52",
            receiveTime: new Date(1613225504710),
            pressTime: new Date(1613225504000),
            reportTime: new Date(1613225460000),
            targetTime: new Date(1613225460000),
            maxIntensity: null,
            shindoList: null,
            originTime: new Date(1613225220000),
            hypocenter: {
              name: "福島県沖",
              code: "289",
              coordinate: {
                latitude: 37.7,
                longitude: 141.8
              },
              depth: 60,
              detailed: null,
              source: null
            },
            magnitude: 7.1,
            isDistant: false,
            tsunami: 1, // ０〜３
            comments: {
              codes: [ "0212" ],
              ja_JP: ["この地震により、日本の沿岸では若干の海面変動があるかもしれませんが、被害の心配はありません。"],
              en_US: ["This earthquake may cause some sea level fluctuations along the coast of Japan, but there is no need to worry about any damage."],
            }
          },
          {
            type: "VXSE53",
            VXSE51とVXSE52を合体させただけだから: "省略"
          },
          {
            type: "VXSE61",
            receiveTime: new Date(1613225504710),
            pressTime: new Date(1613232612000),
            reportTime: new Date(1613232600000),
            targetTime: new Date(1613232600000),
            maxIntensity: null,
            shindoList: null,
            originTime: new Date(1613225280000),
            hypocenter: {
              name: "福島県沖",
              code: "289",
              coordinate: {
                latitude: 37.7283,
                longitude: 141.6983
              },
              depth: 55,
              detailed: null,
              source: null
            },
            magnitude: 7.3,
            isDistant: false,
            tsunami: null,
            comments: {
              codes: [],
              ja_JP: ["度単位の震源要素は、津波情報等を引き続き発表する場合に使用されます。"],
              en_US: [],
            }
          }
        ],
        detail: {
          label: "福島県沖　最大震度6強　13日23時8分頃発生",
          backcolor: "#febb6f",
          textcolor: "#333333"
        },
        current: {
          summaryText: {
            time: ["13日23時8分頃、", "PM 11:08 (UTC+9)"],
            intensity: ["最大震度6強を観測する", " with a maximum intensity of 6+"],
            epicenter: ["震源は福島県沖、", "The epicenter was located in Off the Coast of Fukushima Prefecture,"],
            magnitude: ["地震の規模を表すマグニチュードは7.3、", "A 7.3 magnitude earthquake"],
            depth: ["震源の深さは55kmです。", " with a depth of 55km."],
            comment: ["この地震により、日本の沿岸では若干の海面変動があるかもしれませんが、被害の心配はありません。", "This earthquake may cause some sea level fluctuations along the coast of Japan, but there is no need to worry about any damage."],
          },
          shindoList: ["1", "2", "3", "4", "不明", "5-", "5+", "6-", "6+", "7"],
          timeStr: "2021-02-13 23:07",
          epicenterIndex: 95,
          epicenterName: "福島県沖",
          depthStr: "40",
          magnitude: "5.1",
          maxShindo: 4,
          speechList: [
            { type: "path", path: "quake.start" },
            { type: "path", path: "quake.epicenter.289" },
            { type: "path", path: "quake.epi" },
            { type: "path", path: "common.intensity.6h", gain: 0.65 },
            { type: "path", path: "quake.int" },
            { type: "path", path: "quake.magnitude.73" },
            { type: "path", path: "quake.mag" },
            { type: "path", path: "quake.depth.about" }, // TOOODOOOO
            { type: "path", path: "quake.depth.6" },
            { type: "path", path: "quake.dep" },
            { type: "path", path: "quake.district.250" },
            { type: "path", path: "quake.district.251" },
            { type: "path", path: "quake.int_dist" },
            { type: "path", path: "common.intensity.6h", gain: 0.65 },
            { type: "path", path: "quake.end" },
          ]
        }
      },
      "20210722061500": {
        reports: [
          {
            type: "VXSE53",
            receiveTime: 1626903845509,
            pressTime: 1626903845000,
            reportTime: 1626903840000,
            targetTime: 1626903840000,
            maxIntensity: null,
            shindoList: null,
            originTime: 1626902100000,
            hypocenter: {
              name: "中米",
              code: "945",
              coordinate: {
                latitude: 7.4,
                longitude: -82.5
              },
              depth: "不明",
              detailed: {
                code: "1083",
                name: "パナマ南方"
              },
              source: "ＰＴＷＣ"
            },
            magnitude: 7.0,
            isDistant: true,
            tsunami: 0,
            comments: {
              code: [ "0226", "0230" ],
              ja_JP: [ "震源の近傍で津波発生の可能性があります。", "この地震による日本への津波の影響はありません。" ],
              en_US: [ "There is a possibility of tsunami generation near the epicenter.", "This earthquake poses no tsunami risk to Japan." ]
            }
          }
        ],
        detail: {
          label: "中米　海外の地震　5日12時34分",
          backcolor: "#444444",
          textcolor: "#ffffff"
        }
      },
      "20250101085150": {
        reports: [
          {
            type: "placeholder",
            雑に: "雑に"
          }
        ],
        detail: {
          label: "日向灘　最大震度2　1日8時51分",
          backcolor: "#444444",
          textcolor: "#ffffff"
        },
        summary: {}
      }
    },
  },
  typh_comment: {
    url_info: "https://www.jma.go.jp/bosai/information/data/typhoon.json",
    url_typh: "https://www.jma.go.jp/bosai/typhoon/data/targetTc.json",
    data: {
      TC0101: {
        lastUpdated: 1234567890,
        comment: "あいう",
        number: 0
      }
    },
    onUpdate (){},

    tracker_info: new TrafficTracker("JMA / Typhoon / typhoon.json"),
    tracker_typh: new TrafficTracker("JMA / Typhoon / targetTc.json"),
    tracker_vpti51: new TrafficTracker("JMA / Typhoon / VPTI51"),
    async load(){
      const infolist = await fetch(this.url_info + "?_=" + Date.now()).then(res => res.json());
      this.tracker_info.update();
      const typhlist = await fetch(this.url_typh + "?_=" + Date.now()).then(res => res.json());
      this.tracker_typh.update();
      let isUpdated = false;
      for (let i=infolist.length; i; i--){
        const item = infolist[i-1];
        item.unixtime = new Date(item.datetime) - 0;
        if (item.header !== "VPTI51") continue;
        if (this.data[item.eventId] && this.data[item.eventId].lastUpdated >= item.unixtime) continue;
        const {comment} = await this.vpti51(item.fileName);
        const typhNumber = (typhlist.find(candidate => item.eventId === candidate.tropicalCyclone)?.typhoonNumber ?? "0").slice(-2) - 0;
        this.data[item.eventId] = {
          lastUpdated: item.unixtime,
          comment: comment,
          number: typhNumber
        };
        isUpdated = true;
        }
      if (isUpdated) this.onUpdate(this);
      },
      async vpti51(filename){
      const data = await fetch("https://www.jma.go.jp/bosai/information/data/typhoon/" + filename).then(res => res.json());
      this.tracker_vpti51.update();
      return {
        headline: zen2han(data.headlineText.trim()),
        comment: zen2han(data.commentText.replace(/\n/g, "").trim())
      };
    },
  },
  warn_current: {
    url: "https://www.jma.go.jp/bosai/warning/data/warning/map.json",
    tracker: new TrafficTracker("JMA / Warning / map.json"),
    data: {
      area: [],
      lastUpdated: 0,
      // サンプルの文章に現実の地名入ってたら怒られそうなので
      text: "（＊サンプル文章＊）　【セイライ島】 大雨警報・雷注意報　　【下風蝕地】 乾燥注意報　　【フォンテーヌ邸地区】 大雨特別警報・洪水警報・波浪警報　（インターネット接続を確認してください）"
    },
    onUpdate (){},

    async load(){
      const AreaData = await it.area.getData();
      await fetch(this.url + "?_=" + Date.now()).then(async res => {
        this.tracker.update();
        const lastModified = new Date(res.headers.get("Last-Modified")) / 1000;
        if (this.data.lastUpdated === lastModified) return null; // 更新されていない場合は終了

        const warnList = [];
        const WarnData = await res.json();
        for (const item of WarnData){
          for (const area of item.areaTypes[0].areas){
            if (area.warnings[0].status === "発表警報・注意報はなし") continue; // 2つ必要！！！！
            const warnings = area.warnings.filter(item => {
              // 高潮注意報は、nextKindsが存在する場合にレベルを上げる
              // レベルはフィルターで使われることが多いので、filterの中で処理をする
              if (item.code === "19" && item.nextKinds) item.code = "19+";
              return item.status !== "解除";
            }).map(item => {
              const warn = WarnCodes[item.code];
              return warn.name1 + warn.name2;
            }).join("・");
            if (!warnings) continue; // 2つ必要！！！！

            const class10s = AreaData.class10s[area.code];
            const offices = AreaData.offices[class10s.parent];
            const head2 = area.code.slice(0, 2); // コード先頭2文字
            const pointName = ((["13", "27", "37"].includes(head2) || ["460030", "472000", "473000", "474010", "474020"].includes(area.code)) ? "" : (["01", "46", "47"].includes(head2) ? {"01": "北海道", "46": "鹿児島県", "47": "沖縄県"}[head2] : offices.name)) + class10s.name;

            warnList.push("【" + pointName + "】 " + warnings + (item.attentions ? "（" + item.attentions.join("・") + "）" : ""));
          }
        }
        this.onUpdate(this.data.text = warnList.join("　　"));
        this.data.lastUpdated = lastModified;
      });
    }
  },
  land_current: {
    url: "https://www.jma.go.jp/bosai/warning/data/landslide/map.json",
    data: {
      area: [],
      lastUpdate: 0,
      text: "* Under Construction... *"
    },
    onUpdate (){},

    async load(){
    }
  },
  eew: {
    /** @type {"ws" | "dmdata" | "lmoni"} */
    _source: "ws",
    ws: new WebSocketLoader("ws", "wss://example.com"),
    dmdata: new WebSocketLoader("ws", "wss://example.com"),
    lmoni: {
      url: RequestURL.lmoni_eew,
      offset: 0
    },

    get source (){
      return this._source;
    },
    set source (target){
      this._source = target;
    }
  }
};

const zen2han = stdin => {
  return stdin.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
};

/**
 *
 * @param {String} tsunamiHeight TsunamiHeight
 * @param {Condition} condition Condition
 * @param {Boolean} about おおよその値かどうか（予報値かどうか）
 * @returns
 */
const translateMaxHeight = (tsunamiHeight, condition, about) => {
  const condList = condition.trim().split(/\s+/g);
  let maxHeightJP = "";
  let maxHeightEN = "";
  if (tsunamiHeight){
    const maxHtemp = tsunamiHeight.replace("+", "").replace("<", "").replace(">", "");
    maxHeightJP = maxHtemp + "m";
    maxHeightEN = maxHtemp + " meter(s)";
    // jma.go.jp/bosai/tsunami/data/ のJSONにここらへんの表現入れて欲しい
    if (tsunamiHeight.includes(">")){
      maxHeightJP = maxHeightJP + "未満";
      maxHeightEN = "Under " + maxHeightEN;
    } else if (tsunamiHeight.includes("<")){
      maxHeightJP = maxHeightJP + "以上";
      maxHeightEN = "Over " + maxHeightEN;
    } else {
      if (tsunamiHeight.includes("+")){
        maxHeightJP = maxHeightJP + "（上昇中）";
        maxHeightEN = maxHeightEN + " (rising)";
      }
      maxHeightEN = (about ? "About " : "") + maxHeightEN;
    }
    if (condList.includes("欠測")){ // VTSE51専用
      maxHeightJP = " （欠測）";
      maxHeightEN = " (Data Failure)";
    }
  } else {
    if (condList.includes("微弱")){
      maxHeightJP = "微弱";
      maxHeightEN = "A weak level";
    }
    if (condList.includes("高い")){
      maxHeightJP = "高い";
      maxHeightEN = "A high level";
    }
    if (condList.includes("巨大")){
      maxHeightJP = "巨大";
      maxHeightEN = "A huge level";
    }
    if (condList.includes("観測中")){ // 観測された津波の高さの表現にしか使われない
      maxHeightJP = "観測中";
      maxHeightEN = "Reached Already";
    }
    if (condList.includes("推定中")){ // VTSE52の表現
      maxHeightJP = "推定中";
      maxHeightEN = "Estimated";
    }
    if (condList.includes("欠測")){ // VTSE51専用
      maxHeightJP = "欠測";
      maxHeightEN = "Data Failure";
    }
  }
  return {
    jp: maxHeightJP,
    en: maxHeightEN
  };
};

const AdditionalComments = {
  "0101": {
    "jp": "今後若干の海面変動があるかもしれません。",
    "en": "There may be slight sea-level changes in the future."
  },
  "0102": {
    "jp": "今後若干の海面変動があるかもしれませんが、被害の心配はありません。",
    "en": "There may be slight sea-level changes in the future, but there is no concern for damage."
  },
  "0103": {
    "jp": "今後もしばらく海面変動が続くと思われます。",
    "en": "Sea-level changes are expected to continue for a while."
  },
  "0104": {
    "jp": "今後もしばらく海面変動が続くと思われますので、海水浴や磯釣り等を行う際は注意してください。",
    "en": "Sea-level changes are expected to continue, so please use caution when engaging in activities such as swimming or fishing."
  },
  "0105": {
    "jp": "今後もしばらく海面変動が続くと思われますので、磯釣り等を行う際は注意してください。",
    "en": "Sea-level changes are expected to continue, so please use caution when engaging in activities such as fishing."
  },
  "0107": {
    "jp": "現在、大津波警報・津波警報・津波注意報を発表している沿岸はありません。",
    "en": "There are currently no coastal areas under a major tsunami warning, tsunami warning, or tsunami advisory."
  },
  "0109": {
    "jp": "津波と満潮が重なると、津波はより高くなりますので一層厳重な警戒が必要です。",
    "en": "When tsunamis coincide with high tides, they can be higher, so extra caution is needed."
  },
  "0110": {
    "jp": "津波と満潮が重なると、津波はより高くなりますので十分な注意が必要です。",
    "en": "When tsunamis coincide with high tides, they can be even higher, so please take extra precautions."
  },
  "0111": {
    "jp": "場所によっては、観測した津波の高さよりさらに大きな津波が到達しているおそれがあります。",
    "en": "In some locations, there is a possibility of larger tsunamis reaching than those observed."
  },
  "0112": {
    "jp": "今後、津波の高さは更に高くなることも考えられます。",
    "en": "Tsunami heights may continue to increase in the future."
  },
  "0113": {
    "jp": "沖合での観測値をもとに津波が推定されている沿岸では、早いところでは、既に津波が到達していると推定されます。",
    "en": "In coastal areas where tsunamis are estimated based on offshore measurements, it is estimated that tsunamis have already arrived in some places."
  },
  "0114": {
    "jp": "津波による潮位変化が観測されてから最大波が観測されるまでに数時間以上かかることがあります。",
    "en": "It may take several hours or longer from the observation of tidal changes due to tsunamis to the observation of maximum waves."
  },
  "0115": {
    "jp": "沖合での観測値であり、沿岸では津波はさらに高くなります。",
    "en": "These are offshore observations, and tsunamis will be even higher along the coast."
  },
  "0121": {
    "jp": "＜大津波警報＞ 大きな津波が襲い甚大な被害が発生します。沿岸部や川沿いにいる人はただちに高台や避難ビルなど安全な場所へ避難してください。津波は繰り返し襲ってきます。警報が解除されるまで安全な場所から離れないでください。",
    "en": "[MAJOR TSUNAMI WARNING] A destructive tsunami will strike and cause widespread damage. People in coastal areas and along rivers must evacuate immediately to higher ground or safe buildings. Tsunamis will hit repeatedly, so do not leave safe areas until the warning is lifted."
  },
  "0122": {
    "jp": "＜津波警報＞ 津波による被害が発生します。沿岸部や川沿いにいる人はただちに高台や避難ビルなど安全な場所へ避難してください。津波は繰り返し襲ってきます。警報が解除されるまで安全な場所から離れないでください。",
    "en": "[Tsunami Warning] Tsunami damage is expected. People in coastal areas and along rivers should evacuate immediately to higher ground or safe buildings. Tsunamis will strike repeatedly, so not leave safe areas until the warning is lifted."
  },
  "0123": {
    "jp": "＜津波注意報＞ 海の中や海岸付近は危険です。海の中にいる人はただちに海から上がって、海岸から離れてください。潮の流れが速い状態が続きますので、注意報が解除されるまで海に入ったり海岸に近づいたりしないようにしてください。",
    "en": "[Tsunami Advisory] The sea and coastal areas are dangerous. People in the water should get out of the water immediately and stay away from the coast. Strong currents persist, so do not enter the sea or approach the coast until the advisory is lifted."
  },
  "0124": {
    "jp": "＜津波予報（若干の海面変動）＞ 若干の海面変動が予想されますが、被害の心配はありません。",
    "en": "[Tsunami Forecast] Slight sea-level changes in sea are expected, but there is no concern for damage."
  },
  "0131": {
    "jp": "警報が発表された沿岸部や川沿いにいる人はただちに高台や避難ビルなど安全な場所へ避難してください。到達予想時刻は、予報区のなかで最も早く津波が到達する時刻です。場所によっては、この時刻よりもかなり遅れて津波が襲ってくることがあります。到達予想時刻から津波が最も高くなるまでに数時間以上かかることがありますので、観測された津波の高さにかかわらず、警報が解除されるまで安全な場所から離れないでください。",
    "en": "People in coastal areas and along rivers where warnings have been issued should immediately evacuate to higher ground or safe buildings. The estimated time of arrival reflects the earliest point where tsunamis can hit the forecast area. In some locations, tsunamis may arrive much later than estimated. It can take a few hours or more from the estimated arrival time for tsunamis to reach their maximum height, so do not leave safe areas until the warning is lifted, regardless of observed tsunami heights."
  },
  "0132": {
    "jp": "場所によっては津波の高さが「予想される津波の高さ」より高くなる可能性があります。",
    "en": "Tsunamis may exceed the expected height in some areas."
  },
  "0141": {
    "jp": "東日本大震災クラスの津波が来襲します。",
    "en": "A tsunami of the scale of the Great East Japan Earthquake is approaching."
  },
  "0142": {
    "jp": "沖合で高い津波を観測したため大津波警報・津波警報に切り替えました。",
    "en": "Tsunami warnings have been upgraded due to high tsunamis observed offshore."
  },
  "0143": {
    "jp": "沖合で高い津波を観測したため大津波警報・津波警報を切り替えました。",
    "en": "Tsunami warnings have been switched due to high tsunamis observed offshore."
  },
  "0144": {
    "jp": "沖合で高い津波を観測したため大津波警報に切り替えました。",
    "en": "Tsunami warnings have been upgraded to major tsunami warnings due to huge tsunamis observed offshore."
  },
  "0145": {
    "jp": "沖合で高い津波を観測したため大津波警報を切り替えました。",
    "en": "Major tsunami warnings have been switched due to high tsunamis observed offshore."
  },
  "0146": {
    "jp": "沖合で高い津波を観測したため津波警報に切り替えました。",
    "en": "Tsunami warnings have been upgraded to tsunami warnings due to high tsunamis observed offshore."
  },
  "0147": {
    "jp": "沖合で高い津波を観測したため津波警報を切り替えました。",
    "en": "Tsunami warnings have been switched due to high tsunamis observed offshore."
  },
  "0148": {
    "jp": "沖合で高い津波を観測したため予想される津波の高さを切り替えました。",
    "en": "Tsunami height forecasts have been revised due to high tsunamis observed offshore."
  },
  "0149": {
    "jp": "ただちに避難してください。",
    "en": "EVACUATE IMMEDIATELY"
  },
  "0150": {
    "jp": "南海トラフ地震臨時情報を発表しています。",
    "en": "Currently, Nankai Trough Earthquake Extra Information has been issued."
  },
  "0201": {
    "jp": "強い揺れに警戒してください。",
    "en": "Use caution for strong shaking."
  },
  "0211": {
    "jp": "津波警報等（大津波警報・津波警報あるいは津波注意報）を発表中です。",
    "en": "Tsunami warnings or tsunami advisories are currently in effect."
  },
  "0212": {
    "jp": "この地震により、日本の沿岸では若干の海面変動があるかもしれませんが、被害の心配はありません。",
    "en": "Due to this earthquake, there may be slight sea-level changes along Japan's coast, but there is no concern for damage."
  },
  "0213": {
    "jp": "今後もしばらく海面変動が続くと思われますので、海水浴や磯釣り等を行う際は注意してください。",
    "en": "Sea-level changes are expected to continue for a while, so please use caution when engaging in activities such as swimming or fishing."
  },
  "0214": {
    "jp": "今後もしばらく海面変動が続くと思われますので、磯釣り等を行う際は注意してください。",
    "en": "Sea-level changes are expected to continue for a while, so please use caution when engaging in activities such as fishing."
  },
  "0215": {
    "jp": "この地震による津波の心配はありません。",
    "en": "There is no concern for tsunamis due to this earthquake."
  },
  "0216": {
    "jp": "震源が海底の場合、津波が発生するおそれがあります。",
    "en": "If the epicenter is underwater, there is a possibility of a tsunami."
  },
  "0217": {
    "jp": "今後の情報に注意してください。",
    "en": "Please pay attention to further information."
  },
  "0221": {
    "jp": "太平洋の広域に津波発生の可能性があります。",
    "en": "There is a possibility of a widespread tsunami in the Pacific Ocean."
  },
  "0222": {
    "jp": "太平洋で津波発生の可能性があります。",
    "en": "There is a possibility of tsunami generation in the Pacific Ocean."
  },
  "0223": {
    "jp": "北西太平洋で津波発生の可能性があります。",
    "en": "There is a possibility of tsunami generation in the northwest Pacific Ocean."
  },
  "0224": {
    "jp": "インド洋の広域に津波発生の可能性があります。",
    "en": "There is a possibility of a widespread tsunami in the Indian Ocean."
  },
  "0225": {
    "jp": "インド洋で津波発生の可能性があります。",
    "en": "There is a possibility of tsunami generation in the Indian Ocean."
  },
  "0226": {
    "jp": "震源の近傍で津波発生の可能性があります。",
    "en": "There is a possibility of tsunami generation near the epicenter."
  },
  "0227": {
    "jp": "震源の近傍で小さな津波発生の可能性がありますが、被害をもたらす津波の心配はありません。",
    "en": "Small tsunamis may occur near the epicenter, but there is no need to worry about any significant or destructive tsunamis."
  },
  "0228": {
    "jp": "一般的に、この規模の地震が海域の浅い領域で発生すると、津波が発生することがあります。",
    "en": "Generally, earthquakes of this magnitude in shallow sea areas can trigger tsunamis."
  },
  "0229": {
    "jp": "日本への津波の有無については現在調査中です。",
    "en": "It is currently being investigated whether there are tsunamis in Japan or not."
  },
  "0230": {
    "jp": "この地震による日本への津波の影響はありません。",
    "en": "This earthquake poses no tsunami risk to Japan."
  },
  "0241": {
    "jp": "この地震について、緊急地震速報を発表しています。",
    "en": "Earthquake Early Warning has been issued for this earthquake."
  },
  "0242": {
    "jp": "この地震について、緊急地震速報を発表しています。この地震の最大震度は２でした。",
    "en": "Earthquake Early Warning has been issued for this earthquake. The maximum seismic intensity of this earthquake was 2."
  },
  "0243": {
    "jp": "この地震について、緊急地震速報を発表しています。この地震の最大震度は１でした。",
    "en": "Earthquake Early Warning has been issued for this earthquake. The maximum seismic intensity of this earthquake was 1."
  },
  "0244": {
    "jp": "この地震について、緊急地震速報を発表しています。この地震で震度１以上は観測されていません。",
    "en": "Earthquake Early Warning has been issued for this earthquake. No seismic intensity of 1 or higher was observed in this earthquake."
  },
  "0245": {
    "jp": "この地震で緊急地震速報を発表しましたが、強い揺れは観測されませんでした。",
    "en": "Earthquake Early Warning was issued for this earthquake, but strong shaking was not observed."
  },
  "0256": {
    "jp": "震源要素を訂正します。",
    "en": "The epicenter information is being corrected."
  },
  "0262": {
    "jp": "＊印は気象庁以外の震度観測点についての情報です。",
    "en": "The asterisk (*) indicates information about seismic intensity observations from sources other than the Japan Meteorological Agency."
  },
  "0263": {
    "jp": "＊印は気象庁以外の長周期地震動観測点についての情報です。",
    "en": "The asterisk (*) indicates information about long-period seismic motion observations from sources other than the Japan Meteorological Agency."
  }
};
const WarnCodes = {
  "33": { name1: "大雨", name2: "特別警報", elem: "rain", level: 50 },
  "03": { name1: "大雨", name2: "警報", elem: "rain", level: 30 },
  "10": { name1: "大雨", name2: "注意報", elem: "rain", level: 20 },
  "04": { name1: "洪水", name2: "警報", elem: "flood", level: 30 },
  "18": { name1: "洪水", name2: "注意報", elem: "flood", level: 20 },
  "35": { name1: "暴風", name2: "特別警報", elem: "wind", level: 40 },
  "05": { name1: "暴風", name2: "警報", elem: "wind", level: 30 },
  "15": { name1: "強風", name2: "注意報", elem: "wind", level: 20 },
  "32": { name1: "暴風雪", name2: "特別警報", elem: "wind_snow", level: 40 },
  "02": { name1: "暴風雪", name2: "警報", elem: "wind_snow", level: 30 },
  "13": { name1: "風雪", name2: "注意報", elem: "wind_snow", level: 20 },
  "36": { name1: "大雪", name2: "特別警報", elem: "snow", level: 40 },
  "06": { name1: "大雪", name2: "警報", elem: "snow", level: 30 },
  "12": { name1: "大雪", name2: "注意報", elem: "snow", level: 20 },
  "37": { name1: "波浪", name2: "特別警報", elem: "wave", level: 40 },
  "07": { name1: "波浪", name2: "警報", elem: "wave", level: 30 },
  "16": { name1: "波浪", name2: "注意報", elem: "wave", level: 20 },
  "38": { name1: "高潮", name2: "特別警報", elem: "tide", level: 40 },
  "08": { name1: "高潮", name2: "警報", elem: "tide", level: 40 },
  "19": { name1: "高潮", name2: "注意報", elem: "tide", level: 20 },
  "19+": { name1: "高潮", name2: "注意報", elem: "tide", level: 30 },
  "14": { name1: "雷", name2: "注意報", elem: "thunder", level: 20 },
  "17": { name1: "融雪", name2: "注意報", elem: "snow_melting", level: 20 },
  "20": { name1: "濃霧", name2: "注意報", elem: "fog", level: 20 },
  "21": { name1: "乾燥", name2: "注意報", elem: "dry", level: 20 },
  "22": { name1: "なだれ", name2: "注意報", elem: "avalanche", level: 20 },
  "23": { name1: "低温", name2: "注意報", elem: "cold", level: 20 },
  "24": { name1: "霜", name2: "注意報", elem: "frost", level: 20 },
  "25": { name1: "着氷", name2: "注意報", elem: "ice_accretion", level: 20 },
  "26": { name1: "着雪", name2: "注意報", elem: "snow_accretion", level: 20 },
};
})();
