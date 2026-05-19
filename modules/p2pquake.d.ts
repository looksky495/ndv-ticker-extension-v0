export declare enum IssueType {
  ScalePrompt = "ScalePrompt",
  Destination = "Destination",
  ScaleAndDestination = "ScaleAndDestination",
  DetailScale = "DetailScale",
  Foreign = "Foreign",
  Other = "Other"
}

export declare enum IssueCorrect {
  None = "None",
  Unknown = "Unknown",
  ScaleOnly = "ScaleOnly",
  DestinationOnly = "DestinationOnly",
  ScaleAndDestination = "ScaleAndDestination"
}

export declare enum MaxScale {
  NoInformation = -1,
  Int1 = 10,
  Int2 = 20,
  Int3 = 30,
  Int4 = 40,
  Int5L = 45,
  Int5U = 50,
  Int6L = 55,
  Int6U = 60,
  Int7 = 70
}

export declare enum IntensityScale {
  NoInformation = 46,
  Int1 = 10,
  Int2 = 20,
  Int3 = 30,
  Int4 = 40,
  Int5L = 45,
  Int5U = 50,
  Int6L = 55,
  Int6U = 60,
  Int7 = 70
}

export declare enum domesticTsunami {
  None = "None",
  Unknown = "Unknown",
  Checking = "Checking",
  NonEffective = "NonEffective", // 若干の海面変動
  Watch = "Watch", // 津波注意報
  Warning = "Warning" // 津波予報(種類不明)
}

export declare enum foreignTsunami {
  None = "None",
  Unknown = "Unknown",
  Checking = "Checking",
  NonEffectiveNearby = "NonEffectiveNearby", // 震源の近傍で小さな津波の可能性があるが、被害の心配なし
  WarningNearby = "WarningNearby", // 震源の近傍で津波の可能性がある
  WarningPacific = "WarningPacific", // 太平洋で津波の可能性がある
  WarningPacificWide = "WarningPacificWide", // 太平洋の広域で津波の可能性がある
  WarningIndian = "WarningIndian", // インド洋で津波の可能性がある
  WarningIndianWide = "WarningIndianWide", // インド洋の広域で津波の可能性がある
  Potential = "Potential" // 一般にこの規模では津波の可能性がある
}

export declare interface JMAQuake {
  id: string;
  code: number;
  time: string;
  issue: {
    source: string;
    time: string;
    type: IssueType;
    correct: IssueCorrect;
  };
  earthquake: {
    time: string;
    hypocenter: {
      name: string;
      latitude: number;
      longitude: number;
      depth: number;
      magnitude: number;
    };
    maxScale: MaxScale;
    domesticTsunami: domesticTsunami;
    foreignTsunami: foreignTsunami;
  };
  points: {
    pref: string;
    addr: string;
    isArea: true;
    scale: IntensityScale;
  }[];
  comments: {
    freeFormComment: string;
  };
}
