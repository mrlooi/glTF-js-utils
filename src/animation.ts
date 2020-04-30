import { InterpolationMode, Transformation } from "./types";

export interface Keyframe {
  time: number;
  value: number[];
  interpType: InterpolationMode;

  /*
  For cubicspline interpolation:
  Similar to FBX, rightTangent means outTangent for current keyframe,
  leftTangent means inTangent for next keyframe
  */
  leftTangent?: number[]; // default 0
  leftTangentWeight?: number[]; // default 1/3
  rightTangent?: number[]; // default 0
  rightTangentWeight?: number[]; // default 1/3

  extras?: any;
}

export class Animation {
  static DEFAULT_TANGENT_WEIGHT: number = 1 / 3;
  static DEFAULT_TANGENT: number = 0;

  public keyframes: Keyframe[] = [];
  public path: string;
  public name: string = "";

  public constructor(path: string, name: string = "") {
    this.path = path;
    this.name = name;
  }

  public addKeyframes(keyframes: Keyframe[] | any[]): void {
    for(let kf of keyframes)
      this.addKeyframe(kf.time, kf.value, kf.interpType, kf);
  }

  private _initKeyframeDefaultTangents(keyframe: Keyframe): void {
    const kf = keyframe;
    const N = kf.value.length;

    kf.rightTangent = [];
    kf.leftTangent = [];
    kf.rightTangentWeight = [];
    kf.leftTangentWeight = [];
    for(let i = 0; i < N; ++i)
    {
      kf.rightTangent.push(Animation.DEFAULT_TANGENT);
      kf.leftTangent.push(Animation.DEFAULT_TANGENT);
      kf.rightTangentWeight.push(Animation.DEFAULT_TANGENT_WEIGHT);
      kf.leftTangentWeight.push(Animation.DEFAULT_TANGENT_WEIGHT);
    }
  }

  public addKeyframe(time: number, value: number | number[], interpType: InterpolationMode, extras?: any): void {
    if (!(value instanceof Array)) // a number
      value = [value];
    value = (value as number[]);

    const kf: Keyframe = {
      time,
      value,
      interpType
    };

    if (interpType === InterpolationMode.CUBICSPLINE) {
      this._initKeyframeDefaultTangents(kf);

      if (extras) {
        if ("rightTangent" in extras) {
          let x = extras.rightTangent;
          kf.rightTangent = x instanceof Array ? x : [x];
        } 
        if ("rightTangentWeight" in extras) {
          let x = extras.rightTangentWeight;
          kf.rightTangentWeight = x instanceof Array ? x : [x];
        } 
        if ("leftTangent" in extras) {
          let x = extras.leftTangent;
          kf.leftTangent = x instanceof Array ? x : [x];
        } 
        if ("leftTangentWeight" in extras) {
          let x = extras.leftTangentWeight;
          kf.leftTangentWeight = x instanceof Array ? x : [x];
        }
      }
    }

    this.keyframes.push(kf);
  }
}
