import { QT, QTList } from "./components";

export namespace QuakeList {
  export type EntryTitle = "震度速報" | "震源に関する情報" | "震源・震度情報" | "遠地地震に関する情報" | "地震・津波に関するお知らせ" | "南海トラフ地震関連解説情報" | "南海トラフ地震臨時情報（調査中）" | "南海トラフ地震臨時情報（巨大地震注意）" | "南海トラフ地震臨時情報（巨大地震警戒）" | `南海トラフ地震関連解説情報（第${string}号）` | "北海道・三陸沖後発地震注意情報" | "顕著な地震の震源要素更新のお知らせ" | "地震の活動状況等に関する情報" | "地震回数に関する情報";

  export type EntryIntensity = {
    code: string;
    maxi: QT.ShortIntCode;
  };

  export type QuakeRegionIntensity = {
    code: string;
    maxi: QT.ShortIntCode;
    city?: EntryIntensity[];
  };

  export type QuakeListEntry = {
    ctt: string; // Content Time
    eid: string; // Event ID
    rdt: string; // Report Date-Time (ISO8601)
    ttl: EntryTitle; // Title (ja)
    ift: QTList.EntryInfoType; // Info Type
    ser: `${number}` | 0; // Serial Number (or 0)
    at: string;  // Announced Time (ISO8601)
    anm: string; // Area Name (ja)
    acd: string; // Area Code
    cod: string; // Coordinate String "±lat±lon±depth/"
    mag: string; // Magnitude
    maxi: QT.ShortIntCode; // Max Intensity Code
    int?: QuakeRegionIntensity[]; // Per-Region Intensities (optional)
    json: string; // Detail JSON Filename
    en_ttl?: string; // Title (en)
    en_anm?: string; // Area Name (en)
  };

  export type QuakeList = QuakeListEntry[];
}

export namespace Ltpgm {
  export type LtpgmList = LtpgmListEntry[];
  
  export type LtpgmListEntry = {
    ctt: string; // Content Time
    eid: string; // Event ID
    rdt: string; // Report Date-Time (ISO8601)
    ttl: "長周期地震動に関する観測情報"; // Title (ja)
    ift: QTList.EntryInfoType; // Info Type
    ser: `${number}` | 0; // Serial Number (or 0)
    at: string;  // Announced Time (ISO8601)
    anm: string; // Area Name (ja)
    acd: string; // Area Code
    cod: string; // Coordinate String "±lat±lon±depth/"
    mag: string; // Magnitude
    maxi: QT.ShortIntCode; // Max Intensity Code
    maxl: QT.ShortLgIntCode; // Max Lg Intensity Code
    lg: {
      code: string;
      maxLg: QT.ShortLgIntCode;
      maxInt: QT.ShortIntCode;
    }[];
    int?: QuakeRegionIntensity[]; // Per-Region Intensities (optional)
    json: string; // Detail JSON Filename
    en_anm?: string; // Area Name (en)
  };
}
