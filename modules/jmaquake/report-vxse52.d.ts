import type { QT } from "./components";

export namespace VXSE52 {
  export interface Report extends QT.Report {
    Control: Control;
    Head:    Head;
    Body:    Body;
  }

  export interface Control extends QT.Control {
    Title: "震源に関する情報";
  }

  export interface Head extends QT.Head {
    Title: "震源に関する情報";
    InfoKind: "震源速報";
    Serial: null;
    enTitle: string;
  }
  
  export interface Body extends Required<Pick<QT.Body, "Earthquake" | "Comments">> {
    Earthquake: QT.Earthquake;
  }
}
