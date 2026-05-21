import type { QT } from "./components";

export namespace VXSE53 {
  export namespace Domestic {
    export interface Report extends QT.Report {
      Control: Control;
      Head:    Head;
      Body:    Body;
    }

    export interface Control extends QT.Control {
      Title: "震源・震度に関する情報";
    }

    export interface Head extends QT.Head {
      Title: "震源・震度情報";
      InfoKind: "地震情報";
      Serial: `${number}`;
    }
    
    export interface Body extends Required<Pick<QT.Body, "Earthquake" | "Comments">>, Partial<Pick<QT.Body, "Intensity">> {
      Earthquake: QT.Earthquake | QT.DetailedEarthquake;
      Intensity?: QT.Intensity;
    }
  }

  export namespace Overseas {
    export interface Report extends QT.Report {
      Control: Control;
      Head:    Head;
      Body:    Body;
    }

    export interface Control extends QT.Control {
      Title: "震源・震度に関する情報";
    }

    export interface Head extends QT.Head {
      Title: "遠地地震に関する情報";
      InfoKind: "地震情報";
      Serial: `${number}`;
    }

    export interface Body extends Required<Pick<QT.Body, "Earthquake" | "Comments">> {
      Earthquake: QT.IntlEarthquake;
    }
  }

  export type Report = Domestic.Report | Overseas.Report;
}
