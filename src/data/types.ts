export const SCENE_FAMILIES = ['measurement','motion','force','pressure','buoyancy','mechanics','sound','heat','optics','lens','density','electricity','magnetism','particle','chemical-gas','chemical-reaction','solution','acid-base','separation','combustion'] as const;
export type SceneFamily = typeof SCENE_FAMILIES[number];
export type Subject = 'physics' | 'chemistry';
/** 教材版本：人教版（六三制）与上海版（沪科技版五四制）。 */
export type Edition = 'pep' | 'shanghai';
export interface ExperimentParameter { key: string; label: string; min: number; max: number; step: number; default: number; unit: string; options?: {value:number;label:string}[] }
export interface ExperimentAction { id: string; label: string }
export interface Experiment {
 id: string; bookId: string; chapter: string; title: string; pdfPage: number; printedPage?: number;
 sourceType: '实验'|'演示'|'探究'|'编号实验'|'实验活动'|'课内观察'; sourceLabel?: string;
 family: SceneFamily; sceneVariant: string; objective: string; equipment: string[]; steps: string[]; conclusion: string;
 parameters: ExperimentParameter[]; actions: ExperimentAction[];
 model: {description:string;formula:string;limits:string}; safety?: string;
 sourceVerified: boolean; implementationStatus: 'content-ready' | 'rig-pending';
 /** 复用的人教版同类实验 id；装置与模型沿用该实验。 */
 reusedFrom?: string;
}
export interface Book {
 id:string; edition:Edition; title:string; shortTitle:string; subject:Subject; grade:string; volume:string; color:string;
 description:string; sourceFile:string; sourceId:string; pdfPageCount:number; editionNote:string;
 coverageNote:string; experiments:Experiment[];
}
