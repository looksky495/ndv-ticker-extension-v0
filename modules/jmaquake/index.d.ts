import { VXSE51 } from "./report-vxse51";
import { VXSE52 } from "./report-vxse52";
import { VXSE53 } from "./report-vxse53";
import { VXSE61 } from "./report-vxse61";

export declare namespace JMAQuake {
  export type VXSE51 = VXSE51.Report;
  export type VXSE52 = VXSE52.Report;
  export type VXSE5k = VXSE53.Domestic.Report;
  export type VXSE5e = VXSE53.Overseas.Report;
  export type VXSE61 = VXSE61.Report;

  export type Report = VXSE51 | VXSE52 | VXSE5k | VXSE5e | VXSE61;
}
