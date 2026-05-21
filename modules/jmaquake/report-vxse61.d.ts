import type { QT } from "./components";

export namespace VXSE61 {
  export interface Report extends QT.Report {
    Control: Control;
    Head: Head;
    Body: Body;
  }
  
  export interface Control extends QT.Control {
    Title: "顕著な地震の震源要素更新のお知らせ";
  }
  
  export interface Head extends QT.Head {
    Title: "顕著な地震の震源要素更新のお知らせ";
    InfoKind: "震源要素更新のお知らせ";
    Serial: null;
    enTitle?: never;
  }
  
  export interface Body extends Required<Pick<QT.Body, "Earthquake" | "Comments">> {
    Earthquake: Earthquake;
  }
  
  export interface Earthquake extends QT.Earthquake {
    Hypocenter: Hypocenter;
  }
  
  export interface Hypocenter extends QT.Hypocenter {
    Area: HypocenterArea;
  }
  
  export interface HypocenterArea extends QT.HypocenterArea {
    Coordinate_WGS: string;
  }
}
